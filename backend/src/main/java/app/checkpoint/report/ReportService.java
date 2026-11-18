package app.checkpoint.report;

import app.checkpoint.common.CsvWriter;
import app.checkpoint.common.NotFoundException;
import app.checkpoint.config.AppProperties;
import app.checkpoint.event.Event;
import app.checkpoint.event.EventRepository;
import app.checkpoint.member.Member;
import app.checkpoint.member.MemberRepository;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.report.dto.ClubSummary;
import app.checkpoint.report.dto.MemberHistory;
import app.checkpoint.report.dto.MemberHistory.Outcome;
import app.checkpoint.report.dto.MemberSummary;
import app.checkpoint.rsvp.Rsvp;
import app.checkpoint.rsvp.RsvpRepository;
import app.checkpoint.rsvp.RsvpStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Attendance history across events, for funding requests and sponsor reports. */
@Service
public class ReportService {

    /** Used for "all time": wide enough to include every event. */
    private static final Instant ALL_TIME_FROM = Instant.EPOCH;
    private static final Instant ALL_TIME_TO = Instant.parse("9999-01-01T00:00:00Z");

    private final MemberRepository members;
    private final EventRepository events;
    private final RsvpRepository rsvps;
    private final ZoneId zone;
    private final Clock clock;

    public ReportService(MemberRepository members, EventRepository events, RsvpRepository rsvps,
                         AppProperties properties, Clock clock) {
        this.members = members;
        this.events = events;
        this.rsvps = rsvps;
        this.zone = properties.timeZone();
        this.clock = clock;
    }

    /** @param termId a term like "2027-spring", or null for all time */
    @Transactional(readOnly = true)
    public List<MemberSummary> members(CurrentOrganizer me, String termId) {
        Term term = termId == null ? null : Term.parse(termId);
        return members.attendanceSummary(me.clubId(),
                        term == null ? ALL_TIME_FROM : term.start(zone),
                        term == null ? ALL_TIME_TO : term.end(zone))
                .stream().map(MemberSummary::of).toList();
    }

    @Transactional(readOnly = true)
    public MemberHistory history(CurrentOrganizer me, UUID memberId) {
        Member member = members.findByIdAndClubId(memberId, me.clubId())
                .orElseThrow(() -> new NotFoundException("Member not found."));
        Instant now = clock.instant();
        List<MemberHistory.Entry> entries = rsvps.findByMemberIdOrderByEventStartsAtDesc(memberId).stream()
                .map(r -> new MemberHistory.Entry(r.getEvent().getId(), r.getEvent().getTitle(),
                        r.getEvent().getStartsAt(), r.getStatus(), r.getCheckedInAt(), outcome(r, now)))
                .toList();
        long attended = entries.stream().filter(e -> e.outcome() == Outcome.ATTENDED).count();
        long noShows = entries.stream().filter(e -> e.outcome() == Outcome.NO_SHOW).count();
        return new MemberHistory(member.getId(), member.getName(), member.getEmail(), member.hasCard(),
                attended, noShows, entries);
    }

    static Outcome outcome(Rsvp rsvp, Instant now) {
        Event event = rsvp.getEvent();
        if (rsvp.isCheckedIn()) {
            return Outcome.ATTENDED;
        }
        if (rsvp.getStatus() == RsvpStatus.CANCELLED) {
            return Outcome.CANCELLED;
        }
        if (!event.hasEnded(now)) {
            return Outcome.UPCOMING;
        }
        return rsvp.getStatus() == RsvpStatus.CONFIRMED ? Outcome.NO_SHOW : Outcome.WAITLISTED;
    }

    /** @param termId a term like "2027-spring", or null for the current term */
    @Transactional(readOnly = true)
    public ClubSummary clubSummary(CurrentOrganizer me, String termId) {
        Term term = termId == null ? Term.containing(clock.instant(), zone) : Term.parse(termId);
        Instant from = term.start(zone);
        Instant to = term.end(zone);

        List<ClubSummary.TrendPoint> trend = events.attendanceByEvent(me.clubId(), from, to).stream()
                .map(row -> new ClubSummary.TrendPoint(row.getEventId(), row.getTitle(), row.getStartsAt(),
                        row.getConfirmed(), row.getCheckedIn()))
                .toList();
        long totalCheckIns = trend.stream().mapToLong(ClubSummary.TrendPoint::checkedIn).sum();
        List<ClubSummary.TermOption> terms = events.findByClubIdOrderByStartsAtDesc(me.clubId()).stream()
                .map(event -> Term.containing(event.getStartsAt(), zone))
                .distinct()
                .map(t -> new ClubSummary.TermOption(t.id(), t.label()))
                .toList();

        return new ClubSummary(term.id(), term.label(), trend.size(),
                events.countUniqueAttendees(me.clubId(), from, to), totalCheckIns, trend, terms);
    }

    @Transactional(readOnly = true)
    public String attendanceCsv(CurrentOrganizer me, String termId) {
        CsvWriter csv = new CsvWriter().row("name", "email", "rsvps", "attended", "no_shows", "last_attended_at");
        members(me, termId).forEach(m ->
                csv.row(m.name(), m.email(), m.rsvps(), m.attended(), m.noShows(), m.lastAttendedAt()));
        return csv.toString();
    }
}
