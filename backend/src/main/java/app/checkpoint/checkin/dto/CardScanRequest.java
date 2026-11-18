package app.checkpoint.checkin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** @param cardNumber the number read from the student card's barcode, or typed in */
public record CardScanRequest(@NotBlank @Size(max = 40) String cardNumber) {
}
