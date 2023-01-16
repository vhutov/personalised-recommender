import itertools

from elasticsearch import Elasticsearch, helpers
from sqlalchemy import create_engine, select
from sqlalchemy.engine import URL

from model import artists, tracks


def create_db_connection():
    url_object = URL.create(
        "mysql+mysqlconnector",
        username="user",
        password="user123",
        host="localhost",
        database='music'
    )

    return create_engine(url_object, echo=True, future=True)


def create_elastic():
    return Elasticsearch(hosts='http://localhost:9200')


def create_indinces(es):
    track_mappings = {
        'properties': {
            'name': {
                'type': 'text',
                'analyzer': 'english'
            },
            'artist': {
                'type': 'text',
                'analyzer': 'english'
            }
        }
    }

    artist_mappings = {
        'properties': {
            'name': {
                'type': 'text',
                'analyzer': 'english'
            },
        }
    }

    if not es.indices.exists(index='tracks'):
        es.indices.create(index='tracks', mappings=track_mappings)


    if not es.indices.exists(index='artists'):
        es.indices.create(index='artists', mappings=artist_mappings)


def to_es_action_track(item):
    return {
        '_op_type': 'create',
        '_index': 'tracks',
        '_id': item['uri'],
        'name': item['name'],
        'artist': item['artist']
    }


def to_es_action_artist(item):
    return {
        '_op_type': 'create',
        '_index': 'artists',
        '_id': item['uri'],
        'name': item['name']
    }


def to_actions_track(batch):
    return [to_es_action_track(i) for i in batch if i is not None]


def to_actions_artists(batch):
    return [to_es_action_artist(i) for i in batch if i is not None]


def read_tracks(connection):
    columns = select(tracks, artists.c.name.label('artist'))

    rows = connection.execute(columns.select_from(tracks).join(artists))

    return rows


def read_artists(connection):
    return connection.execute(artists.select())


def rows_batches(rows, bs=1000):
    while True:
        batch = list(itertools.islice(rows, bs))
        if not batch:
            return
        yield batch

def index_tracks(engine, es):
    with engine.connect() as connection:

        rows = read_tracks(connection)

        for batch in rows_batches(rows):
            print('indexing next batch')
            actions = to_actions_track(batch)
            resp = helpers.bulk(es, actions=actions)
            print(resp)

        print('finished indexing tracks')


def index_artists(engine, es):
    with engine.connect() as connection:
        
        rows = read_artists(connection)

        for batch in rows_batches(rows):
            print('indexing next batch')
            actions = to_actions_artists(batch)
            resp = helpers.bulk(es, actions=actions)
            print(resp)
            
        print('finished indexing artists')


engine = create_db_connection()
es = create_elastic()

create_indinces(es)
index_tracks(engine, es)
index_artists(engine, es)
