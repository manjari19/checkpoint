package app.checkpoint.report;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;

/**
 * An SFU academic term: Spring (January to April), Summer (May to August) or Fall (September to December).
 * Identified in URLs as "2027-spring".
 */
public record Term(int year, Season season) {

    public enum Season {
        SPRING(1), SUMMER(5), FALL(9);

        final int startMonth;

        Season(int startMonth) {
            this.startMonth = startMonth;
        }
    }

    public static Term containing(LocalDate date) {
        Season season = date.getMonthValue() >= 9 ? Season.FALL
                : date.getMonthValue() >= 5 ? Season.SUMMER
                : Season.SPRING;
        return new Term(date.getYear(), season);
    }

    public static Term containing(Instant instant, ZoneId zone) {
        return containing(LocalDate.ofInstant(instant, zone));
    }

    /** Parses "2027-spring". */
    public static Term parse(String id) {
        String[] parts = id.split("-");
        try {
            if (parts.length != 2) {
                throw new IllegalArgumentException();
            }
            return new Term(Integer.parseInt(parts[0]), Season.valueOf(parts[1].toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown term '" + id + "'. Use a form like 2027-spring.");
        }
    }

    public String id() {
        return year + "-" + season.name().toLowerCase(Locale.ROOT);
    }

    public String label() {
        String name = season.name();
        return name.charAt(0) + name.substring(1).toLowerCase(Locale.ROOT) + " " + year;
    }

    /** First instant of the term in the club's time zone. */
    public Instant start(ZoneId zone) {
        return LocalDate.of(year, season.startMonth, 1).atStartOfDay(zone).toInstant();
    }

    /** First instant after the term, which is the start of the next term. */
    public Instant end(ZoneId zone) {
        return LocalDate.of(year, season.startMonth, 1).plusMonths(4).atStartOfDay(zone).toInstant();
    }
}
