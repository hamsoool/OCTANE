from pathlib import Path

p = Path(r"c:\Users\hansol\Documents\Projects\octane\server\src\utils\email.ts")
lines = p.read_text(encoding="utf-8").splitlines(keepends=True)

# Keep lines 1..110 (index 0..109): ends with the new sendPasswordResetCode closing brace.
# Everything after that is the stale duplicate sendVerificationCode.
assert lines[109].rstrip() == "}", repr(lines[109])
assert "sendPasswordResetCode" in lines[107], repr(lines[107])

p.write_text("".join(lines[:110]), encoding="utf-8")
print("trimmed to", len(lines[:110]), "lines")
print("".join(lines[104:110]))
