# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class SimpleTest(gl.Contract):
    result: str

    def __init__(self):
        self.result = ""

    @gl.public.write
    def test_prompt(self) -> str:
        def _run():
            return gl.nondet.exec_prompt("What is 2+2? Reply with just the number.")

        out = gl.eq_principle.prompt_non_comparative(
            _run,
            task="Answer a math question",
            criteria="The answer should be the number 4",
        )
        self.result = out
        return out

    @gl.public.view
    def get_result(self) -> str:
        return self.result
