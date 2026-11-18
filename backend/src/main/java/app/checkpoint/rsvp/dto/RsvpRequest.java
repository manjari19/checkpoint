package app.checkpoint.rsvp.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * What a member submits on the public RSVP page.
 *
 * @param sponsorOptIn      the member agrees that sponsors may scan their ticket to get their name and email
 * @param studentCardNumber optional; if present, cardConsent must be true
 * @param cardConsent       the member agrees to link their student card for faster check-in
 */
public record RsvpRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 254) String email,
        boolean sponsorOptIn,
        @Size(max = 40) String studentCardNumber,
        boolean cardConsent) {

    public boolean hasCardNumber() {
        return studentCardNumber != null && !studentCardNumber.isBlank();
    }

    @JsonIgnore
    @Schema(hidden = true)
    @AssertTrue(message = "Please agree to link your student card, or leave the card number empty.")
    public boolean isCardConsentGiven() {
        return !hasCardNumber() || cardConsent;
    }
}
