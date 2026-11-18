package app.checkpoint.organizer;

import app.checkpoint.club.ClubRepository;
import app.checkpoint.common.ConflictException;
import app.checkpoint.member.MemberService;
import app.checkpoint.organizer.dto.NewOrganizerRequest;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organizer accounts. Also the UserDetailsService Spring Security uses to check a password at login.
 */
@Service
public class OrganizerService implements UserDetailsService {

    private final OrganizerRepository organizers;
    private final ClubRepository clubs;
    private final PasswordEncoder passwordEncoder;

    public OrganizerService(OrganizerRepository organizers, ClubRepository clubs, PasswordEncoder passwordEncoder) {
        this.organizers = organizers;
        this.clubs = clubs;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        Organizer organizer = organizers.findByEmail(MemberService.normaliseEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("No organizer with that email"));
        return User.withUsername(organizer.getEmail())
                .password(organizer.getPasswordHash())
                .roles("ORGANIZER")
                .build();
    }

    @Transactional(readOnly = true)
    public CurrentOrganizer currentOrganizer(String email) {
        Organizer o = organizers.findByEmail(MemberService.normaliseEmail(email)).orElseThrow();
        return new CurrentOrganizer(o.getId(), o.getClub().getId(), o.getClub().getName(), o.getEmail(),
                o.getDisplayName());
    }

    /** Adds another organizer to the logged-in organizer's club, for example a new exec member. */
    @Transactional
    public CurrentOrganizer create(CurrentOrganizer me, NewOrganizerRequest request) {
        String email = MemberService.normaliseEmail(request.email());
        if (organizers.existsByEmail(email)) {
            throw new ConflictException("An organizer with that email already exists.");
        }
        Organizer organizer = organizers.save(new Organizer(clubs.getReferenceById(me.clubId()), email,
                passwordEncoder.encode(request.password()), request.displayName().trim()));
        return new CurrentOrganizer(organizer.getId(), me.clubId(), me.clubName(), organizer.getEmail(),
                organizer.getDisplayName());
    }
}
