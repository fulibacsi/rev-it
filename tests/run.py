"""Runs every browser test in this folder, one after another, and lists the ones that failed: a non-zero exit, page
errors (an `ERRORS:` line that isn't `none`) or failed checks (a line starting with `FAIL`). Each test's own output
says what it saw; pass test names to run only those (`python tests/run.py touch_test pedal_lock`)."""
import subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
names = sys.argv[1:] or sorted(f.stem for f in HERE.glob("*.py") if f.stem not in ("common", "run"))
failed = []
for name in names:
    t0 = time.time()
    r = subprocess.run([sys.executable, str(HERE / f"{name}.py")], capture_output=True, text=True, cwd=HERE.parent)
    out = r.stdout + r.stderr
    bad = r.returncode != 0 or any(l.startswith("FAIL") or l.startswith("ERRORS:") and not l.startswith("ERRORS: none")
                                   for l in out.splitlines())
    print(f"{'FAILED' if bad else 'ok':6} {name} ({time.time() - t0:.0f} s)")
    if bad:
        failed.append(name)
        print("\n".join("    " + l for l in out.strip().splitlines()[-12:]))
print("all passed" if not failed else f"failed: {' '.join(failed)}")
sys.exit(1 if failed else 0)
