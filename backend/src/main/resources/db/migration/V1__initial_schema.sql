-- Checkpoint initial schema.
-- All ids are UUIDs so public links (RSVP pages, tickets) cannot be guessed by counting.

create table club (
    id         uuid primary key,
    name       text        not null,
    created_at timestamptz not null default now()
);

create table organizer (
    id            uuid primary key,
    club_id       uuid        not null references club (id),
    email         text        not null unique,
    password_hash text        not null,
    display_name  text        not null,
    created_at    timestamptz not null default now()
);

create table event (
    id          uuid primary key,
    club_id     uuid        not null references club (id),
    title       text        not null,
    description text        not null default '',
    location    text        not null,
    starts_at   timestamptz not null,
    ends_at     timestamptz not null,
    capacity    integer     not null check (capacity > 0),
    created_at  timestamptz not null default now(),
    constraint event_ends_after_start check (ends_at > starts_at)
);

create index event_club_starts_idx on event (club_id, starts_at);

-- Each sponsor gets a secret booth code. The booth page uses it instead of a login.
create table sponsor (
    id         uuid primary key,
    event_id   uuid        not null references event (id) on delete cascade,
    name       text        not null,
    booth_code text        not null unique,
    created_at timestamptz not null default now()
);

-- A member is a person known to one club, identified by email.
-- card_hash is an HMAC of the student card number. The raw number is never stored.
create table member (
    id             uuid primary key,
    club_id        uuid        not null references club (id),
    name           text        not null,
    email          text        not null,
    card_hash      text,
    card_linked_at timestamptz,
    created_at     timestamptz not null default now(),
    constraint member_email_per_club unique (club_id, email),
    constraint member_card_per_club unique (club_id, card_hash)
);

create table rsvp (
    id              uuid primary key,
    event_id        uuid        not null references event (id) on delete cascade,
    member_id       uuid        not null references member (id),
    status          text        not null check (status in ('CONFIRMED', 'WAITLISTED', 'CANCELLED')),
    -- Secret for the "view ticket / cancel" link in the email. Never shown in the QR code.
    manage_token    text        not null unique,
    -- Encoded in the QR code. Lets staff and sponsors identify the ticket but not cancel it.
    ticket_code     text        not null unique,
    sponsor_opt_in  boolean     not null default false,
    created_at      timestamptz not null default now(),
    promoted_at     timestamptz,
    cancelled_at    timestamptz,
    checked_in_at   timestamptz,
    check_in_method text check (check_in_method in ('QR', 'CARD', 'MANUAL')),
    constraint rsvp_check_in_requires_confirmed check (checked_in_at is null or status = 'CONFIRMED')
);

-- A member can hold at most one active (not cancelled) RSVP per event.
create unique index rsvp_one_active_per_member on rsvp (event_id, member_id) where status <> 'CANCELLED';
-- Speeds up "who is next on the waitlist" lookups.
create index rsvp_waitlist_order_idx on rsvp (event_id, created_at, id) where status = 'WAITLISTED';
create index rsvp_member_idx on rsvp (member_id);

create table sponsor_lead (
    id         uuid primary key,
    sponsor_id uuid        not null references sponsor (id) on delete cascade,
    rsvp_id    uuid        not null references rsvp (id) on delete cascade,
    scanned_at timestamptz not null default now(),
    constraint sponsor_lead_once unique (sponsor_id, rsvp_id)
);
