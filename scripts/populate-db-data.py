import csv
import itertools
from io import TextIOWrapper
from zipfile import ZipFile

from sqlalchemy import create_engine
from sqlalchemy.engine import URL

from model import artists, metadata, tracks


def connect():
    url_object = URL.create(
        "mysql+mysqlconnector",
        username="user",
        password="user123",
        host="localhost",
        database='music'
    )

    return create_engine(url_object, echo=True, future=True)


def create_tables(engine):
    metadata.create_all(engine)


def lines_stream():
    with ZipFile('./scripts/playlist_events.zip', 'r') as file:
        files = file.namelist()

        for f in files:
            with file.open(f, 'r') as myfile:
                myfile = TextIOWrapper(myfile)
                reader = csv.DictReader(myfile, delimiter=',')
                yield from reader


def row_batches(lines_iterator, bs):
    while (True):
        rows = list(itertools.islice(lines_iterator, bs))

        if not rows:
            break

        yield rows


def to_artist_row(line):
    return {
        'uri': line['artist_uri'], 
        'name': line['artist_name']
    }


def to_track_row(line):
    return {
        'uri': line['track_uri'], 
        'name': line['track_name'], 
        'artist_uri': line['artist_uri']
    }


def prepare_insert(seen_artists, seen_tracks, batch):
    artist_rows = [
        to_artist_row(r) for r in batch if r['artist_uri'] not in seen_artists
    ]

    track_rows = [
        to_track_row(r) for r in batch if r['track_uri'] not in seen_tracks
    ]

    seen_artists.update(r['uri'] for r in artist_rows)
    seen_tracks.update(r['uri'] for r in track_rows)

    return artist_rows, track_rows


def populate_tables(engine):
    batch_size = 1_000
    lines = lines_stream()

    seen_artists = set()
    seen_tracks = set()

    for batch, i in zip(row_batches(lines, batch_size), range(0)):
        batch_offest = i*batch_size
        print(f'Inserting [{batch_offest}, {batch_offest + batch_size}) values')

        artist_rows, track_rows = prepare_insert(seen_artists, seen_tracks, batch)

        with engine.connect() as connection:

            if artist_rows:
                connection.execute(
                    artists.insert().prefix_with('IGNORE'),
                    artist_rows
                )

            if track_rows:
                connection.execute(
                    tracks.insert().prefix_with('IGNORE'),
                    track_rows
                )

            if artist_rows or track_rows:
                connection.commit()
    
engine = connect()

create_tables(engine)
populate_tables(engine)