package app.checkpoint.common;

import java.util.Arrays;
import java.util.List;

/**
 * Minimal RFC 4180 CSV builder.
 *
 * <p>Besides quoting, it neutralises "CSV injection": a cell starting with =, +, - or @ is treated
 * as a formula by Excel and Google Sheets. Attendee names come from a public form, so such cells
 * get a leading apostrophe, which spreadsheets display as plain text.
 */
public final class CsvWriter {

    private final StringBuilder out = new StringBuilder();

    public CsvWriter row(List<?> cells) {
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) {
                out.append(',');
            }
            out.append(escape(cells.get(i)));
        }
        out.append("\r\n");
        return this;
    }

    public CsvWriter row(Object... cells) {
        return row(Arrays.asList(cells));
    }

    @Override
    public String toString() {
        return out.toString();
    }

    static String escape(Object value) {
        if (value == null) {
            return "";
        }
        String text = value.toString();
        if (!text.isEmpty() && "=+-@".indexOf(text.charAt(0)) >= 0) {
            text = "'" + text;
        }
        boolean needsQuotes = text.contains(",") || text.contains("\"") || text.contains("\n") || text.contains("\r");
        return needsQuotes ? '"' + text.replace("\"", "\"\"") + '"' : text;
    }
}
