package app.checkpoint.organizer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NewOrganizerRequest(
        @NotBlank @Size(max = 100) String displayName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 10, max = 100) String password) {
}
