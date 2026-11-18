-- A category per event, shown as a chip on event cards and used to group events in reports.
alter table event
    add column category text not null default 'OTHER'
        check (category in ('NETWORKING', 'WORKSHOP', 'PANEL', 'SOCIAL', 'HACKATHON', 'OTHER'));
