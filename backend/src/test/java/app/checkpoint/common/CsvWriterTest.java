package app.checkpoint.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CsvWriterTest {

    @Test
    void writesRowsWithCrlfLineEndings() {
        String csv = new CsvWriter().row("name", "email").row("Ada", "ada@test.local").toString();
        assertThat(csv).isEqualTo("name,email\r\nAda,ada@test.local\r\n");
    }

    @Test
    void quotesCellsWithCommasQuotesAndNewlines() {
        assertThat(CsvWriter.escape("Lovelace, Ada")).isEqualTo("\"Lovelace, Ada\"");
        assertThat(CsvWriter.escape("Ada \"The Countess\"")).isEqualTo("\"Ada \"\"The Countess\"\"\"");
        assertThat(CsvWriter.escape("two\nlines")).isEqualTo("\"two\nlines\"");
    }

    @Test
    void neutralisesSpreadsheetFormulas() {
        assertThat(CsvWriter.escape("=HYPERLINK(\"http://evil\")")).startsWith("\"'=");
        assertThat(CsvWriter.escape("+1")).isEqualTo("'+1");
        assertThat(CsvWriter.escape("@SUM(A1)")).isEqualTo("'@SUM(A1)");
    }

    @Test
    void nullBecomesAnEmptyCell() {
        assertThat(new CsvWriter().row("a", null, "c").toString()).isEqualTo("a,,c\r\n");
    }
}
