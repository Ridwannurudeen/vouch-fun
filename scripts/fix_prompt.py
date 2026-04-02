"""Fix the AI evaluation prompt in vouch_protocol.py for better grading accuracy."""
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/opt/vouch-deploy/vouch_protocol.py"

with open(path, "r") as f:
    lines = f.readlines()

# Find the prompt assignment and the return statement
start = None
end = None
for i, line in enumerate(lines):
    stripped = line.strip()
    if "prompt = " in line and ("trust evaluation" in line or "trust dimensions" in line or "Rate " in line):
        start = i
    if start is not None and i > start and "return gl.nondet.exec_prompt" in line:
        end = i
        break

if start is None or end is None:
    print(f"ERROR: not found (start={start}, end={end})")
    sys.exit(1)

print(f"Replacing lines {start+1}-{end}")

replacement = '''            prompt = ("You are a trust evaluation oracle. Rate " + the_ident + " (" + the_idt + ") on 6 trust dimensions.\\n"
                      "Evidence: " + ev + "\\n" + extra + "\\n"
                      "GRADING: A=exceptional top 5pct (protocol creator, 10k+ stars). B=strong active contributor (1k+ stars, regular commits). C=moderate activity. D=minimal. F=no evidence.\\n"
                      "Grade generously for well-known figures. Famous security researchers and prolific OSS devs deserve A in code. Do not underweight high star counts or famous repos.\\n"
                      "For dimensions without direct evidence (onchain/defi/governance for GitHub-only user), use F.\\n"
                      "Return JSON with keys: code, onchain, social, governance, defi, identity, score, tier.\\n"
                      "Each dimension is a letter grade A/B/C/D/F. score is 0-100. tier is TRUSTED(80+)/MODERATE(50-79)/LOW(25-49)/UNTRUSTED(0-24).\\n"
                      "Return ONLY the JSON object.")
'''

lines[start:end] = [replacement]

with open(path, "w") as f:
    f.writelines(lines)

print("OK — prompt fixed for better accuracy")
