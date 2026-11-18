package app.checkpoint.support;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * Runs tasks on separate threads and releases them at the same instant, to create as much contention as
 * possible. Each task waits at a start gate (a CountDownLatch) until every thread is ready.
 */
public final class Concurrently {

    private Concurrently() {
    }

    /** Runs every task at once and returns each one's result or exception, in task order. */
    public static <T> List<Outcome<T>> run(List<Callable<T>> tasks) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(tasks.size());
        CountDownLatch ready = new CountDownLatch(tasks.size());
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (Callable<T> task : tasks) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    return task.call();
                }));
            }
            ready.await();
            go.countDown();

            List<Outcome<T>> outcomes = new ArrayList<>();
            for (Future<T> future : futures) {
                try {
                    outcomes.add(new Outcome<>(future.get(60, TimeUnit.SECONDS), null));
                } catch (Exception e) {
                    outcomes.add(new Outcome<>(null, e.getCause() != null ? e.getCause() : e));
                }
            }
            return outcomes;
        } finally {
            pool.shutdownNow();
        }
    }

    public record Outcome<T>(T value, Throwable error) {

        public boolean succeeded() {
            return error == null;
        }
    }
}
