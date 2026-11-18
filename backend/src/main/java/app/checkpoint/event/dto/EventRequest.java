package app.checkpoint.event.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public record EventRequest(
        @NotBlank @Size(max = 120) String title,
        @Size(max = 4000) String description,
        @NotBlank @Size(max = 200) String location,
        @NotNull Instant startsAt,
        @NotNull Instant endsAt,
        @Min(1) @Max(5000) int capacity,
        @Schema(description = "Sponsor names. Only used when creating an event; "
                + "afterwards, add or remove sponsors with the sponsor endpoints.")
        List<@NotBlank @Size(max = 120) String> sponsors) {

    public List<String> sponsorsOrEmpty() {
        return sponsors == null ? List.of() : sponsors;
    }
}
