import sys
import re

def fix_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # The merge conflicts in these files are simply due to trailing spaces / blank lines
    # conflicting between branch "jules-11986908240209845272-7bb45222" and "main" updates.
    # We will favor the `<<<<<<< Updated upstream` ... `======` block to keep things cleaner.

    # We can just match the pattern and replace with the upper block
    pattern = re.compile(r'<<<<<<< Updated upstream\n(.*?)=======\n(.*?)>>>>>>> Stashed changes\n', re.DOTALL)

    def replacement(match):
        # We prefer keeping the updated upstream code, which is main
        # But wait, our changes were stashed! So we actually want Stashed changes?
        # Let's inspect: stashed changes has the trailing space or our new code.
        # Actually in all shown grep results, the logic is identical, it's just trailing spaces.
        # Let's just keep the stashed changes because that's OUR branch changes.
        return match.group(2)

    new_content = pattern.sub(replacement, content)

    with open(filename, 'w') as f:
        f.write(new_content)

for file in [
    'jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js',
    'jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html',
    'jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js'
]:
    fix_file(file)
