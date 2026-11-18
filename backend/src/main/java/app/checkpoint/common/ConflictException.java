package app.checkpoint.common;

/** Thrown when a request is valid but clashes with the current state, for example a duplicate RSVP. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
