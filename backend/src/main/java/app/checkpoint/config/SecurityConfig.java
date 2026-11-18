package app.checkpoint.config;

import app.checkpoint.organizer.OrganizerService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

/**
 * Who can call what.
 *
 * <ul>
 *   <li>/api/public/** (RSVP and ticket pages) and /api/booth/** (sponsor booths) need no login.
 *       The secret in the URL (event id, ticket token, booth code) is the key.</li>
 *   <li>Every other /api/** endpoint needs a logged-in organizer.</li>
 * </ul>
 *
 * <p>Organizers log in with a session cookie, which the browser sends automatically. That makes the
 * organizer endpoints a target for cross-site request forgery, so they require a CSRF token: the server
 * puts it in the XSRF-TOKEN cookie, and Angular's HttpClient copies it into the X-XSRF-TOKEN header on
 * every write request. A malicious site cannot read our cookie, so it cannot forge that header.
 * The public and booth endpoints do not use the session at all, so CSRF does not apply to them.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/public/**", "/api/booth/**", "/api/auth/login").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/actuator/health/**", "/error").permitAll()
                        .requestMatchers("/api/**").hasRole("ORGANIZER")
                        .anyRequest().denyAll())
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                        .ignoringRequestMatchers("/api/public/**", "/api/booth/**"))
                // Not logged in: answer 401 instead of redirecting to a login page. The SPA shows its own.
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .securityContext(context -> context.securityContextRepository(securityContextRepository()));
        return http.build();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    /** BCrypt by default, with an algorithm prefix on each hash so it can be upgraded later. */
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(OrganizerService organizers, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(organizers);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
}
