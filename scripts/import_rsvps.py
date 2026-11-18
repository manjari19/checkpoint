"""Import RSVPs from a Google Forms CSV export into a Checkpoint event.

Each row becomes an RSVP through Checkpoint's public RSVP endpoint, the same one the RSVP page uses.
So imported people get exactly what they would have got by RSVPing themselves: a confirmed seat while
seats last, then a place on the waitlist, and an email with their ticket. Rows are sent in the order
the form received them (the Timestamp column), so seats still go first come, first served.

Run it inside Docker, never with a local Python (see scripts/import-rsvps.sh):

    scripts/import-rsvps.sh --event <event id> path/to/responses.csv --dry-run
    scripts/import-rsvps.sh --event <event id> path/to/responses.csv

Columns are matched by name, ignoring case:
    name         "Name", "Full name", "Your name", "First and last name"
    email        "Email", "Email address", "E-mail", "SFU email"
    timestamp    "Timestamp" (optional; Google Forms always adds it)
    sponsors     any column with "sponsor" in its name, answered yes or no (optional)
Other columns are ignored. Student card numbers are never imported: linking a card needs the member's
own consent on the RSVP page.

Exit codes: 0 when every row was imported (or would be, with --dry-run), 1 when some rows were
skipped or refused, 2 for problems with the command or the file.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Iterable

NAME_HEADERS = {"name", "full name", "your name", "first and last name"}
EMAIL_HEADERS = {"email", "email address", "e-mail", "e-mail address", "sfu email"}
TIMESTAMP_HEADERS = {"timestamp"}
# Google Forms writes timestamps in the form owner's locale; these cover the common ones.
TIMESTAMP_FORMATS = (
    "%m/%d/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
    "%Y/%m/%d %I:%M:%S %p %Z",
    "%Y/%m/%d %H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
)
YES = {"yes", "y", "true", "1", "i agree", "agree", "ok", "sure"}
NO = {"no", "n", "false", "0", ""}
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CsvFileError(Exception):
    """A problem with the whole file (not one row), such as a missing column."""


@dataclass
class Row:
    """One valid response, ready to send."""

    line: int
    name: str
    email: str
    sponsor_opt_in: bool
    submitted_at: datetime | None


@dataclass
class Problem:
    line: int
    message: str


@dataclass
class Parsed:
    rows: list[Row] = field(default_factory=list)
    problems: list[Problem] = field(default_factory=list)
    ignored_columns: list[str] = field(default_factory=list)


def normalise_header(header: str) -> str:
    """'Email Address:' -> 'email address'."""
    return re.sub(r"\s+", " ", header.strip().strip(":?*").strip()).lower()


def parse_yes_no(value: str) -> bool | None:
    """True for yes, False for no, None when it can't tell."""
    text = value.strip().lower()
    if text in YES or text.startswith("yes"):
        return True
    if text in NO or text.startswith("no"):
        return False
    return None


def parse_timestamp(value: str) -> datetime | None:
    text = value.strip()
    for fmt in TIMESTAMP_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def find_columns(headers: list[str]) -> tuple[dict[str, int], list[str]]:
    """Maps 'name', 'email', 'timestamp' and 'sponsor' to column positions; returns ignored headers too."""
    columns: dict[str, int] = {}
    ignored: list[str] = []
    for index, header in enumerate(headers):
        key = normalise_header(header)
        if key in NAME_HEADERS and "name" not in columns:
            columns["name"] = index
        elif key in EMAIL_HEADERS and "email" not in columns:
            columns["email"] = index
        elif key in TIMESTAMP_HEADERS and "timestamp" not in columns:
            columns["timestamp"] = index
        elif "sponsor" in key and "sponsor" not in columns:
            columns["sponsor"] = index
        elif header.strip():
            ignored.append(header.strip())
    missing = [c for c in ("name", "email") if c not in columns]
    if missing:
        raise CsvFileError(
            f"The CSV has no {' or '.join(missing)} column. Found: {', '.join(h for h in headers if h.strip())}."
        )
    return columns, ignored


def parse_csv(lines: Iterable[str]) -> Parsed:
    """Reads the export, checks every row, and orders the good ones by when they were submitted."""
    reader = csv.reader(lines)
    try:
        headers = next(reader)
    except StopIteration:
        raise CsvFileError("The CSV file is empty.") from None
    columns, ignored = find_columns(headers)
    parsed = Parsed(ignored_columns=ignored)
    seen: dict[str, int] = {}

    def cell(values: list[str], key: str) -> str:
        index = columns.get(key)
        return values[index].strip() if index is not None and index < len(values) else ""

    # Line 1 is the header, so the first response is line 2, matching the row numbers in Google Sheets.
    for line, values in enumerate(reader, start=2):
        if not any(v.strip() for v in values):
            continue
        name = cell(values, "name")
        email = cell(values, "email").lower()
        if not name:
            parsed.problems.append(Problem(line, "missing name"))
            continue
        if len(name) > 100:
            parsed.problems.append(Problem(line, "name is longer than 100 characters"))
            continue
        if not email:
            parsed.problems.append(Problem(line, f"missing email for {name}"))
            continue
        if not EMAIL_PATTERN.match(email) or len(email) > 254:
            parsed.problems.append(Problem(line, f'"{email}" is not a valid email'))
            continue
        if email in seen:
            parsed.problems.append(Problem(line, f"{email} already answered on line {seen[email]}; keeping the first answer"))
            continue

        submitted_at = None
        if "timestamp" in columns and cell(values, "timestamp"):
            submitted_at = parse_timestamp(cell(values, "timestamp"))
            if submitted_at is None:
                parsed.problems.append(Problem(line, f'can\'t read the timestamp "{cell(values, "timestamp")}"'))
                continue

        sponsor_opt_in = False
        if "sponsor" in columns:
            answer = parse_yes_no(cell(values, "sponsor"))
            if answer is None:
                parsed.problems.append(
                    Problem(line, f'sponsor answer "{cell(values, "sponsor")}" is not yes or no'))
                continue
            sponsor_opt_in = answer

        seen[email] = line
        parsed.rows.append(Row(line, name, email, sponsor_opt_in, submitted_at))

    # First come, first served. Rows without a timestamp keep their place in the file (the sort is stable).
    parsed.rows.sort(key=lambda r: (r.submitted_at is None, r.submitted_at or datetime.min))
    return parsed


class Api:
    """The two public endpoints the importer needs."""

    def __init__(self, base_url: str, opener: Callable = urllib.request.urlopen):
        self.base_url = base_url.rstrip("/")
        self.opener = opener

    def event(self, event_id: str) -> dict:
        return self._call("GET", f"/api/public/events/{event_id}")

    def rsvp(self, event_id: str, row: Row) -> dict:
        body = {"name": row.name, "email": row.email, "sponsorOptIn": row.sponsor_opt_in,
                "studentCardNumber": None, "cardConsent": False}
        return self._call("POST", f"/api/public/events/{event_id}/rsvps", body)

    def _call(self, method: str, path: str, body: dict | None = None) -> dict:
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(self.base_url + path, data=data, method=method,
                                         headers={"Content-Type": "application/json", "Accept": "application/json"})
        with self.opener(request, timeout=15) as response:
            return json.loads(response.read() or b"{}")


def api_error_message(error: urllib.error.HTTPError) -> str:
    """The server's own explanation (Spring's ProblemDetail 'detail' or field errors), or the status."""
    try:
        problem = json.loads(error.read() or b"{}")
    except (ValueError, OSError):
        problem = {}
    if isinstance(problem.get("errors"), dict) and problem["errors"]:
        return "; ".join(f"{k}: {v}" for k, v in problem["errors"].items())
    return problem.get("detail") or f"HTTP {error.code}"


def run(argv: list[str], out=sys.stdout, api_factory: Callable[[str], Api] = Api) -> int:
    parser = argparse.ArgumentParser(description="Import RSVPs from a Google Forms CSV export into a Checkpoint event.")
    parser.add_argument("csv", help="the CSV file downloaded from Google Forms (Responses > Download responses)")
    parser.add_argument("--event", required=True, help="the event id (the last part of its RSVP link, /e/<id>)")
    parser.add_argument("--api", default="http://localhost:8180", help="Checkpoint API address (default: %(default)s)")
    parser.add_argument("--dry-run", action="store_true", help="check the file and show what would happen, without importing")
    args = parser.parse_args(argv)

    def say(text: str = "") -> None:
        print(text, file=out)

    try:
        with open(args.csv, newline="", encoding="utf-8-sig") as file:
            parsed = parse_csv(file)
    except FileNotFoundError:
        say(f"Can't find the file {args.csv}.")
        return 2
    except (CsvFileError, UnicodeDecodeError, csv.Error) as e:
        say(f"Can't read {args.csv}: {e}")
        return 2

    api = api_factory(args.api)
    try:
        event = api.event(args.event)
    except urllib.error.HTTPError as e:
        say(f"Can't find event {args.event}: {api_error_message(e)}")
        return 2
    except (urllib.error.URLError, OSError) as e:
        say(f"Can't reach the Checkpoint API at {args.api}: {getattr(e, 'reason', e)}")
        return 2

    say(f"Event: {event.get('title')} ({event.get('spotsLeft')} of {event.get('capacity')} spots left)")
    if parsed.ignored_columns:
        say(f"Ignoring columns: {', '.join(parsed.ignored_columns)}")
    for problem in sorted(parsed.problems, key=lambda p: p.line):
        say(f"Line {problem.line}: skipped, {problem.message}")
    say()

    if args.dry_run:
        spots = max(0, int(event.get("spotsLeft") or 0))
        already_waiting = int(event.get("waitlistLength") or 0)
        for position, row in enumerate(parsed.rows):
            if position < spots:
                outcome = "would be confirmed"
            else:
                outcome = f"would join the waitlist (#{already_waiting + position - spots + 1})"
            say(f"Line {row.line}: {row.name} <{row.email}> {outcome}")
        say()
        say(f"Dry run: {len(parsed.rows)} ready to import, {len(parsed.problems)} skipped. Nothing was imported.")
        say("Without --dry-run, each person is emailed their ticket, as if they had RSVPed themselves.")
        return 1 if parsed.problems else 0

    confirmed = waitlisted = refused = 0
    for row in parsed.rows:
        try:
            ticket = api.rsvp(args.event, row)
        except urllib.error.HTTPError as e:
            refused += 1
            say(f"Line {row.line}: {row.name} <{row.email}> refused, {api_error_message(e)}")
            continue
        except (urllib.error.URLError, OSError) as e:
            say(f"Line {row.line}: lost the connection to the API ({getattr(e, 'reason', e)}). Stopped here.")
            say("Rows before this one were imported. Run the import again: people already imported are refused, not duplicated.")
            return 1
        if ticket.get("status") == "WAITLISTED":
            waitlisted += 1
            say(f"Line {row.line}: {row.name} <{row.email}> waitlisted (#{ticket.get('waitlistPosition')})")
        else:
            confirmed += 1
            say(f"Line {row.line}: {row.name} <{row.email}> confirmed")

    say()
    say(f"Imported {confirmed + waitlisted}: {confirmed} confirmed, {waitlisted} waitlisted. "
        f"Refused by the server: {refused}. Skipped in the file: {len(parsed.problems)}.")
    return 1 if refused or parsed.problems else 0


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))
