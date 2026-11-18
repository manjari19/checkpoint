package app.checkpoint.report;

import app.checkpoint.common.CsvResponses;
import app.checkpoint.member.MemberService;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.report.dto.ClubSummary;
import app.checkpoint.report.dto.MemberHistory;
import app.checkpoint.report.dto.MemberSummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Members and reports", description = "Attendance history across events")
@RestController
public class ReportController {

    private final ReportService reports;
    private final MemberService members;

    public ReportController(ReportService reports, MemberService members) {
        this.reports = reports;
        this.members = members;
    }

    @Operation(summary = "Members with their attendance totals")
    @GetMapping("/api/members")
    public List<MemberSummary> members(@AuthenticationPrincipal CurrentOrganizer me,
                                       @Parameter(description = "Term like 2027-spring; all time if omitted")
                                       @RequestParam(required = false) String term) {
        return reports.members(me, term);
    }

    @Operation(summary = "One member's RSVPs and attendance across events")
    @GetMapping("/api/members/{memberId}")
    public MemberHistory member(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID memberId) {
        return reports.history(me, memberId);
    }

    @Operation(summary = "Unlink a member's student card (lost card or withdrawn consent)")
    @DeleteMapping("/api/members/{memberId}/card")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlinkCard(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID memberId) {
        members.unlinkCard(me.clubId(), memberId);
    }

    @Operation(summary = "Club summary for a term: unique attendees and attendance per event")
    @GetMapping("/api/reports/summary")
    public ClubSummary summary(@AuthenticationPrincipal CurrentOrganizer me,
                               @Parameter(description = "Term like 2027-spring; current term if omitted")
                               @RequestParam(required = false) String term) {
        return reports.clubSummary(me, term);
    }

    @Operation(summary = "Download member attendance as CSV, for funding and sponsor reports")
    @GetMapping(value = "/api/reports/attendance.csv", produces = "text/csv")
    public ResponseEntity<String> attendanceCsv(@AuthenticationPrincipal CurrentOrganizer me,
                                                @Parameter(description = "Term like 2027-spring; all time if omitted")
                                                @RequestParam(required = false) String term) {
        String filename = "attendance-" + (term == null ? "all-time" : Term.parse(term).id()) + ".csv";
        return CsvResponses.download(filename, reports.attendanceCsv(me, term));
    }
}
