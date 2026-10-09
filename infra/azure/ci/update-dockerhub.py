"""Publish repository overviews without logging credentials or tokens."""
import json
import os
from pathlib import Path
import urllib.request


def request(path, data, token=None, method='POST'):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'JWT ' + token
    req = urllib.request.Request('https://hub.docker.com' + path, data=json.dumps(data).encode(), headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


token = request('/v2/users/login/', {'username': os.environ['DOCKERHUB_USERNAME'], 'password': os.environ['DOCKERHUB_TOKEN']})['token']
for variable, filename, description in [
    ('APP_REPOSITORY', 'portfolio-app.md', 'Ataimo engineering portfolio and consultancy web application. Copyright Ataimo Edem.'),
    ('WORKER_REPOSITORY', 'portfolio-worker.md', 'Background events, email, push notifications and telemetry for the Ataimo portfolio platform.'),
]:
    repository = os.environ[variable]
    if len(repository.split('/')) != 2:
        raise ValueError('Expected namespace/repository')
    request('/v2/repositories/' + repository + '/', {'description': description, 'full_description': Path('docs/docker/' + filename).read_text()}, token, 'PATCH')
    print('Updated Docker Hub overview:', repository)
