from sqlalchemy import Column, ForeignKey, MetaData, String, Table

metadata = MetaData()

artists = Table(
    "artists", metadata,
    Column('uri', String(32), primary_key=True),
    Column('name', String(100), nullable=False)
)

tracks = Table(
    "tracks", metadata,
    Column('uri', String(32), primary_key=True),
    Column('name', String(100), nullable=False),
    Column('artist_uri', String(32), ForeignKey('artists.uri'), nullable=False)
)
