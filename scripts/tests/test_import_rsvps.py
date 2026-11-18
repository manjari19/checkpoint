"""Tests for scripts/import_rsvps.py. Run inside Docker with scripts/test-scripts.sh."""

import io
import json
import os
import sys
import tempfile
import unittest
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import import_rsvps  # noqa: E402
from import_rsvps import Api, CsvFileError, parse_csv, parse_timestamp, parse_yes_no, run  # noqa: E402

SAMPLE = os.path.join(os.path.dirname(__file__), "..", "samples", "google-forms-rsvps.csv")


class FakeApi:
    """Stands in for the Checkpoint API: 2 seats left, and remembers every RSVP it was sent."""

    def __init__(self, base_url, spots_left=2, refuse=()):
        self.base_url = base_url
        self.spots_left = spots_left
        self.refuse = set(refuse)
        self.sent = []

    def event(self, event_id):
        return {"title": "Networking Night", "capacity": 40, "spotsLeft": self.spots_left, "waitlistLength": 0}

    def rsvp(self, event_id, row):
        if row.email in self.refuse:
            body = json.dumps({"detail": "This email already has an RSVP for this event."}).encode()
            raise urllib.error.HTTPError("url", 409, "Conflict", {}, io.BytesIO(body))
        self.sent.append(row)
        if len(self.sent) <= self.spots_left:
            return {"status": "CONFIRMED", "waitlistPosition": None}
        return {"status": "WAITLISTED", "waitlistPosition": len(self.sent) - self.spots_left}


def run_with(argv, api):
    out = io.StringIO()
    code = run(argv, out=out, api_factory=lambda url: api)
    return code, out.getvalue()


class ParsingTest(unittest.TestCase):
    def test_the_sample_file_keeps_good_rows_and_explains_bad_ones(self):
        with open(SAMPLE, newline="", encoding="utf-8-sig") as file:
            parsed = parse_csv(file)

        self.assertEqual(len(parsed.rows), 6)
        problems = {p.line: p.message for p in parsed.problems}
        self.assertIn("missing email", problems[6])
        self.assertIn("not a valid email", problems[7])
        self.assertIn("already answered on line 2", problems[9])
        self.assertIn("not yes or no", problems[10])
        self.assertEqual(parsed.ignored_columns, ["Which program are you in?"])

    def test_rows_are_ordered_by_when_the_form_was_submitted(self):
        with open(SAMPLE, newline="", encoding="utf-8-sig") as file:
            parsed = parse_csv(file)
        # Priya submitted at 08:58, before Leila (09:14) who is first in the file.
        self.assertEqual(parsed.rows[0].name, "Priya Raman")
        self.assertEqual(parsed.rows[1].name, "Leila Moradi")

    def test_emails_are_compared_without_case_and_sponsor_answers_are_read(self):
        parsed = parse_csv(io.StringIO(
            "Name,Email,Share with sponsors?\nAda,ADA@example.com,Yes please\nGrace,grace@example.com,no\n"))
        self.assertEqual([r.email for r in parsed.rows], ["ada@example.com", "grace@example.com"])
        self.assertEqual([r.sponsor_opt_in for r in parsed.rows], [True, False])

    def test_a_file_without_an_email_column_is_refused(self):
        with self.assertRaises(CsvFileError) as caught:
            parse_csv(io.StringIO("Timestamp,Name\n11/02/2026 09:00:00,Ada\n"))
        self.assertIn("no email column", str(caught.exception))

    def test_blank_lines_are_ignored_and_line_numbers_match_the_spreadsheet(self):
        parsed = parse_csv(io.StringIO("Name,Email\n\nAda,ada@example\n"))
        self.assertEqual(parsed.problems[0].line, 3)

    def test_helpers(self):
        self.assertTrue(parse_yes_no("Yes, that's fine"))
        self.assertFalse(parse_yes_no(""))
        self.assertIsNone(parse_yes_no("maybe"))
        self.assertIsNotNone(parse_timestamp("11/02/2026 09:14:52"))
        self.assertIsNotNone(parse_timestamp("2026-11-02 09:14:52"))
        self.assertIsNone(parse_timestamp("yesterday"))


class RunTest(unittest.TestCase):
    def test_a_dry_run_sends_nothing_and_predicts_seats(self):
        api = FakeApi("x", spots_left=2)
        code, output = run_with(["--event", "e1", SAMPLE, "--dry-run"], api)

        self.assertEqual(api.sent, [])
        self.assertIn("Line 4: Priya Raman <priya.raman@example.com> would be confirmed", output)
        self.assertIn("would join the waitlist (#1)", output)
        self.assertIn("Nothing was imported", output)
        self.assertEqual(code, 1)  # the sample has bad rows on purpose

    def test_an_import_sends_rows_in_order_and_reports_each_outcome(self):
        api = FakeApi("x", spots_left=2, refuse={"noor.haddad@example.com"})
        code, output = run_with(["--event", "e1", SAMPLE], api)

        self.assertEqual([r.name for r in api.sent][:2], ["Priya Raman", "Leila Moradi"])
        self.assertIn("Priya Raman <priya.raman@example.com> confirmed", output)
        self.assertIn("waitlisted (#1)", output)
        self.assertIn("refused, This email already has an RSVP for this event.", output)
        self.assertIn("Imported 5: 2 confirmed, 3 waitlisted. Refused by the server: 1. Skipped in the file: 4.", output)
        self.assertEqual(code, 1)

    def test_a_clean_file_exits_with_zero(self):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as file:
            file.write("Name,Email\nAda,ada@example.com\n")
        try:
            code, _ = run_with(["--event", "e1", file.name], FakeApi("x"))
        finally:
            os.unlink(file.name)
        self.assertEqual(code, 0)

    def test_a_missing_file_exits_with_two(self):
        code, output = run_with(["--event", "e1", "/nope.csv"], FakeApi("x"))
        self.assertEqual(code, 2)
        self.assertIn("Can't find the file", output)


class ApiTest(unittest.TestCase):
    def test_posts_the_same_json_as_the_rsvp_page_without_a_card_number(self):
        requests = []

        class Response(io.BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        def opener(request, timeout):
            requests.append(request)
            return Response(b'{"status": "CONFIRMED"}')

        row = import_rsvps.Row(2, "Ada", "ada@example.com", True, None)
        Api("http://api:8180/", opener).rsvp("e1", row)

        self.assertEqual(requests[0].full_url, "http://api:8180/api/public/events/e1/rsvps")
        self.assertEqual(requests[0].get_method(), "POST")
        self.assertEqual(json.loads(requests[0].data), {
            "name": "Ada", "email": "ada@example.com", "sponsorOptIn": True,
            "studentCardNumber": None, "cardConsent": False})


if __name__ == "__main__":
    unittest.main()
