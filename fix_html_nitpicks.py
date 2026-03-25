import sys
import re

filename = 'jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html'

with open(filename, 'r') as f:
    content = f.read()

# Remove the duplicated orphaned error message block and the stray </div>
orphaned_block = r'\s*<p id="login-error-msg" style="color: #e74c3c; font-weight: bold; margin-top: 10px;" class="hidden"><\/p>\s*<\/div>'
new_content = re.sub(orphaned_block, '', content)

with open(filename, 'w') as f:
    f.write(new_content)
