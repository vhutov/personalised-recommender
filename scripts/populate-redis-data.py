from io import TextIOWrapper
from zipfile import ZipFile

import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# index_names = {
#     'matrix_factorisation': 'matrix_factorisation_similarity.txt',
#     'mlp': 'multilayer_perceptron_similarity.txt',
#     'coco': 'coco_similar.txt'
# }


index_names = {
    'm': 'matrix_factorisation_similarity.txt',
    'a': 'multilayer_perceptron_similarity.txt',
    'c': 'coco_similar.txt',
    't': 'track_similarity.txt'
}


def populate_index(index_name, file_name):
    for l in file_name:
        [key, *values] = l.strip().split(' ')

        full_key = f'{index_name}:{key}'

        r.lpush(full_key, *values)



with ZipFile('./similar.zip', 'r') as file:
    files = file.namelist()

    for f in files:
        for index_name, suffix in index_names.items():
            if f.endswith(suffix):
                with file.open(f, 'r') as zip_file:
                    populate_index(index_name, TextIOWrapper(zip_file))
                continue            
        
with open('./track_similarity.txt', 'rt') as file:
    populate_index('tracks', file)