package app.checkpoint.config;

import app.checkpoint.club.Club;
import app.checkpoint.club.ClubRepository;
import app.checkpoint.organizer.Organizer;
import app.checkpoint.organizer.OrganizerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * On first start (empty database), creates the club and its first organizer account from the
 * checkpoint.bootstrap.* settings, so there is someone who can log in. Does nothing afterwards.
 */
@Component
public class BootstrapData implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapData.class);

    private final AppProperties properties;
    private final ClubRepository clubs;
    private final OrganizerRepository organizers;
    private final PasswordEncoder passwordEncoder;

    public BootstrapData(AppProperties properties, ClubRepository clubs, OrganizerRepository organizers,
                         PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.clubs = clubs;
        this.organizers = organizers;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Bootstrap bootstrap = properties.bootstrap();
        if (bootstrap == null || bootstrap.adminEmail() == null || bootstrap.adminEmail().isBlank()
                || clubs.count() > 0) {
            return;
        }
        Club club = clubs.save(new Club(bootstrap.clubName()));
        organizers.save(new Organizer(club, bootstrap.adminEmail(), passwordEncoder.encode(bootstrap.adminPassword()),
                bootstrap.adminName()));
        log.info("Created club '{}' with organizer {}", club.getName(), bootstrap.adminEmail());
    }
}
