package app.checkpoint.member;

import app.checkpoint.common.ConflictException;
import app.checkpoint.common.NotFoundException;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {

    private final MemberRepository members;
    private final CardNumberHasher hasher;

    public MemberService(MemberRepository members, CardNumberHasher hasher) {
        this.members = members;
        this.hasher = hasher;
    }

    public static String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** Returns the club's member with this email, creating them on their first RSVP. */
    @Transactional
    public Member findOrCreate(UUID clubId, String email, String name) {
        String normalised = normaliseEmail(email);
        members.insertIfAbsent(clubId, normalised, name.trim());
        return members.findByClubIdAndEmail(clubId, normalised).orElseThrow();
    }

    /**
     * Links a student card to a member, storing only the card's keyed hash.
     *
     * <p>A card that is already linked to someone else, or a member who already has a different card,
     * is rejected rather than overwritten. Otherwise anyone who knows a member's email could replace
     * their card. An organizer can unlink a card first (see {@link #unlinkCard}).
     */
    @Transactional
    public void linkCard(Member member, String cardNumber, Instant now) {
        String hash = hasher.hash(cardNumber);
        if (hash.equals(member.getCardHash())) {
            return;
        }
        if (member.hasCard()) {
            throw new ConflictException(
                    "A different student card is already linked to this email. Ask an organizer to update it.");
        }
        members.findByClubIdAndCardHash(member.getClub().getId(), hash).ifPresent(other -> {
            throw new ConflictException(
                    "This student card is already linked to another member. Ask an organizer for help.");
        });
        member.linkCard(hash, now);
    }

    /** Removes a member's card link, for example when they lose their card or withdraw consent. */
    @Transactional
    public void unlinkCard(UUID clubId, UUID memberId) {
        Member member = members.findByIdAndClubId(memberId, clubId)
                .orElseThrow(() -> new NotFoundException("Member not found."));
        member.linkCard(null, null);
    }
}
