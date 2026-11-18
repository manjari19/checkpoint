package app.checkpoint.checkin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** @param ticketCode the text inside the ticket's QR code */
public record TicketScanRequest(@NotBlank @Size(max = 100) String ticketCode) {
}
