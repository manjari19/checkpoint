package app.checkpoint.common;

/** Thrown when a resource does not exist, or exists but belongs to another club. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
