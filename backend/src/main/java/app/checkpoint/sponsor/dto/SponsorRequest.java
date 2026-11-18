package app.checkpoint.sponsor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SponsorRequest(@NotBlank @Size(max = 120) String name) {
}
