package app.checkpoint.rsvp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import app.checkpoint.club.Club;
import app.checkpoint.common.ConflictException;
import app.checkpoint.common.SecureTokens;
import app.checkpoint.event.Event;
import app.checkpoint.event.EventRepository;
import app.checkpoint.member.Member;
import app.checkpoint.member.MemberService;
import app.checkpoint.notification.RsvpNotification;
import app.checkpoint.rsvp.dto.TicketView;
import app.checkpoint.support.TestData;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Limit;

/**
 * Unit tests for the seat decisions in RsvpService, with every dependency mocked.
 * The real locking is tested against PostgreSQL in WaitlistConcurrencyTest.
 */
@ExtendWith(MockitoExtension.class)
class RsvpServiceTest {

    static final Instant NOW = Instant.parse("2027-01-10T20:00:00Z");

    @Mock
    EventRepository events;
    @Mock
    RsvpRepository rsvps;
    @Mock
    MemberService members;
    @Mock
    ApplicationEventPublisher publisher;

    RsvpService service;
    Event event;
    UUID eventId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new RsvpService(events, rsvps, members, new SecureTokens(), publisher,
                Clock.fixed(NOW, ZoneOffset.UTC));
        event = new Event(new Club("Test"), "Networking Night", "", "SFU", NOW.plus(Duration.ofDays(10)),
                NOW.plus(Duration.ofDays(10)).plus(Duration.ofHours(3)), 2);
    }

    @Test
    void anRsvpLocksTheEventBeforeCountingSeats() {
        givenRsvpSetup(0);
        service.rsvp(eventId, TestData.rsvpRequest("Ada"));
        // The lock query must be used, never a plain findById.
        verify(events).findByIdForUpdate(eventId);
        verify(events, never()).findById(any());
    }

    @Test
    void anRsvpIsConfirmedWhileSeatsRemain() {
        givenRsvpSetup(1);
        TicketView ticket = service.rsvp(eventId, TestData.rsvpRequest("Ada"));
        assertThat(ticket.status()).isEqualTo(RsvpStatus.CONFIRMED);
        verify(publisher).publishEvent(argThat((RsvpNotification n) -> n.kind() == RsvpNotification.Kind.CONFIRMED));
    }

    @Test
    void anRsvpIsWaitlistedWhenEverySeatIsTaken() {
        givenRsvpSetup(2);
        when(rsvps.waitlistPosition(any(), any(), any())).thenReturn(3);

        TicketView ticket = service.rsvp(eventId, TestData.rsvpRequest("Ada"));

        assertThat(ticket.status()).isEqualTo(RsvpStatus.WAITLISTED);
        assertThat(ticket.waitlistPosition()).isEqualTo(3);
        assertThat(ticket.ticketCode()).isNull();
    }

    @Test
    void anRsvpAfterTheEventStartedIsRefused() {
        Event started = new Event(new Club("Test"), "Past", "", "SFU", NOW.minus(Duration.ofHours(1)),
                NOW.plus(Duration.ofHours(2)), 10);
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(started));

        assertThatThrownBy(() -> service.rsvp(eventId, TestData.rsvpRequest("Late")))
                .isInstanceOf(ConflictException.class);
        verify(rsvps, never()).save(any());
    }

    @Test
    void fillOpenSeatsPromotesOnlyAsManyAsThereAreOpenSeats() {
        Rsvp first = waitlisted();
        when(rsvps.countByEventIdAndStatus(any(), any())).thenReturn(1L);
        when(rsvps.findWaitlist(any(), any())).thenReturn(List.of(first));

        List<Rsvp> promoted = service.fillOpenSeats(event, NOW);

        // Capacity 2, 1 confirmed: ask the database for exactly 1 person.
        verify(rsvps).findWaitlist(any(), argThat((Limit limit) -> limit.max() == 1));
        assertThat(promoted).containsExactly(first);
        assertThat(first.getStatus()).isEqualTo(RsvpStatus.CONFIRMED);
        verify(publisher, times(1)).publishEvent(any(RsvpNotification.class));
    }

    @Test
    void fillOpenSeatsDoesNothingWhenTheEventIsFull() {
        when(rsvps.countByEventIdAndStatus(any(), any())).thenReturn(2L);

        assertThat(service.fillOpenSeats(event, NOW)).isEmpty();
        verify(rsvps, never()).findWaitlist(any(), any());
    }

    private void givenRsvpSetup(long confirmedSoFar) {
        Member member = mock(Member.class);
        when(member.getId()).thenReturn(UUID.randomUUID());
        when(member.getEmail()).thenReturn("ada@test.local");
        when(member.getName()).thenReturn("Ada");
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event));
        when(members.findOrCreate(any(), anyString(), anyString())).thenReturn(member);
        when(rsvps.countByEventIdAndStatus(eventId, RsvpStatus.CONFIRMED)).thenReturn(confirmedSoFar);
        when(rsvps.save(any(Rsvp.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Rsvp waitlisted() {
        Member member = mock(Member.class);
        when(member.getEmail()).thenReturn("next@test.local");
        when(member.getName()).thenReturn("Next");
        return new Rsvp(event, member, RsvpStatus.WAITLISTED, "manage", "code", false, NOW.minus(Duration.ofDays(1)));
    }
}
