package app.checkpoint.sponsor.dto;

/**
 * The result of a sponsor scanning an attendee's ticket.
 * lead is only filled in when the attendee opted in to sharing their contact.
 */
public record BoothScanResult(Outcome outcome, String message, BoothView.Lead lead) {

    public enum Outcome {
        SAVED,
        ALREADY_SAVED,
        /** The attendee did not agree to share their contact. Nothing about them is revealed. */
        NOT_OPTED_IN,
        /** Not a valid ticket for this event. */
        NOT_FOUND
    }
}
