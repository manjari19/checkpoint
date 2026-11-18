package app.checkpoint.rsvp;

public enum CheckInMethod {
    /** Scanned the QR code on the attendee's ticket. */
    QR,
    /** Scanned the barcode on the attendee's student card. */
    CARD,
    /** An organizer checked them in from the attendee list, e.g. their phone died. */
    MANUAL
}
