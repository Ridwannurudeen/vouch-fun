# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class SimpleTest(gl.Contract):
    count: u32
    data: str

    def __init__(self):
        self.count = 0
        self.data = "{}"

    @gl.public.write
    def ping(self) -> str:
        self.count += 1
        return "pong"

    @gl.public.write
    def store(self, key: str, val: str) -> str:
        d = json.loads(self.data)
        d[key] = val
        self.data = json.dumps(d)
        self.count += 1
        return self.data

    @gl.public.view
    def get_count(self) -> str:
        return str(self.count)

    @gl.public.view
    def get_data(self) -> str:
        return self.data
