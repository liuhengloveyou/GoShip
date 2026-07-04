---
author: GoPress
pubDatetime: 2026-04-27T10:15:09Z
title: "post-1"
draft: false
tags:
  - "asdfas asdfa asdf"
description: "asdfasdfasdfasdfasdfasdf"
---

<h3><strong>Overview </strong><a href="https://pkg.go.dev/modernc.org/sqlite#pkg-overview"><strong>¶</strong></a></h3>
<ul><li><p><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Fragile_modernc_org_libc_dependency">Fragile modernc.org/libc dependency</a></p>
</li>
<li><p><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Thanks">Thanks</a></p>
</li>
<li><p><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Supported_platforms_and_architectures">Supported platforms and architectures</a></p>
</li>
<li><p><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Benchmarks">Benchmarks</a></p>
</li>
<li><p><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Builders">Builders</a></p>
</li>
<li><p><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Connecting_to_a_database">Connecting to a database</a></p>
</li>
<li><p><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Debug_and_development_versions">Debug and development versions</a></p>
</li>
<li><p><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Hacking">Hacking</a></p>
</li>
<li><p><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Sqlite_documentation">Sqlite documentation</a></p>
</li>
</ul>
<p>Package sqlite is a sql/database driver using a CGo-free port of the C SQLite3 library.</p>
<p>SQLite is an in-process implementation of a self-contained, serverless, zero-configuration, transactional SQL database engine.</p>
<h4><strong>Fragile modernc.org/libc dependency </strong><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Fragile_modernc_org_libc_dependency"><strong>¶</strong></a></h4>
<p>When you import this package you should use in your go.mod file the exact same version of modernc.org/libc as seen in the go.mod file of this repository.</p>
<p>See the discussion at <a href="https://gitlab.com/cznic/sqlite/-/issues/177">https://gitlab.com/cznic/sqlite/-/issues/177</a> for more details.</p>
<h4><strong>Thanks </strong><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Thanks"><strong>¶</strong></a></h4>
<p>This project is sponsored by Schleibinger Geräte Teubert u. Greim GmbH by allowing one of the maintainers to work on it also in office hours.</p>
<h4><strong>Supported platforms and architectures </strong><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Supported_platforms_and_architectures"><strong>¶</strong></a></h4>
<p>These combinations of GOOS and GOARCH are currently supported</p>
<pre><code>OS      Arch    SQLite version
------------------------------
darwin	amd64   3.53.0
darwin	arm64   3.53.0
freebsd	amd64   3.53.0
freebsd	arm64   3.53.0
linux	386     3.53.0
linux	amd64   3.53.0
linux	arm     3.53.0
linux	arm64   3.53.0
linux	loong64 3.53.0
linux	ppc64le 3.53.0
linux	riscv64 3.53.0
linux	s390x   3.53.0
windows	386     3.53.0
windows	amd64   3.53.0
windows	arm64   3.53.0
</code>
</pre>
<h4><strong>Benchmarks </strong><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Benchmarks"><strong>¶</strong></a></h4>
<p><a href="https://pkg.go.dev/modernc.org/sqlite-bench#readme-tl-dr-scorecard">The SQLite Drivers Benchmarks Game</a></p>
<h4><strong>Builders </strong><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Builders"><strong>¶</strong></a></h4>
<p>Builder results available at:</p>
<p><a href="https://modern-c.appspot.com/-/builder/?importpath=modernc.org%2fsqlite">https://modern-c.appspot.com/-/builder/?importpath=modernc.org%2fsqlite</a></p>
<h4><strong>Connecting to a database </strong><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Connecting_to_a_database"><strong>¶</strong></a></h4>
<p>To access a Sqlite database do something like</p>
<pre><code>import (
	"database/sql"

	_ "modernc.org/sqlite"
)

...

db, err := sql.Open("sqlite", dsnURI)

...
</code>
</pre>
<h4><strong>Debug and development versions </strong><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Debug_and_development_versions"><strong>¶</strong></a></h4>
<p>A comma separated list of options can be passed to <code>go generate</code>
 via the environment variable GO_GENERATE. Some useful options include for example:</p>
<pre><code>-DSQLITE_DEBUG
-DSQLITE_MEM_DEBUG
-ccgo-verify-structs
</code>
</pre>
<p>To create a debug/development version, issue for example:</p>
<pre><code>$ GO_GENERATE=-DSQLITE_DEBUG,-DSQLITE_MEM_DEBUG go generate
</code>
</pre>
<p>Note: To run <code>go generate</code>
 you need to have modernc.org/ccgo/v3 installed.</p>
<h4><strong>Hacking </strong><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Hacking"><strong>¶</strong></a></h4>
<p>This is an example of how to use the debug logs in modernc.org/libc when hunting a bug.</p>
<pre><code>0:jnml@e5-1650:~/src/modernc.org/sqlite$ git status
On branch master
Your branch is up to date with 'origin/master'.

nothing to commit, working tree clean
0:jnml@e5-1650:~/src/modernc.org/sqlite$ git log -1
commit df33b8d15107f3cc777799c0fe105f74ef499e62 (HEAD -&gt; master, tag: v1.21.1, origin/master, origin/HEAD, wips, ok)
Author: Jan Mercl &lt;0xjnml@gmail.com&gt;
Date:   Mon Mar 27 16:18:28 2023 +0200

    upgrade to SQLite 3.41.2
0:jnml@e5-1650:~/src/modernc.org/sqlite$ rm -f /tmp/libc.log ; go test -v -tags=libc.dmesg -run TestScalar ; ls -l /tmp/libc.log
test binary compiled for linux/amd64
=== RUN   TestScalar
--- PASS: TestScalar (0.09s)
PASS
ok  modernc.org/sqlite 0.128s
-rw-r--r-- 1 jnml jnml 76 Apr  6 11:22 /tmp/libc.log
0:jnml@e5-1650:~/src/modernc.org/sqlite$ cat /tmp/libc.log
[10723 sqlite.test] 2023-04-06 11:22:48.288066057 +0200 CEST m=+0.000707150
0:jnml@e5-1650:~/src/modernc.org/sqlite$
</code>
</pre>
<p>The /tmp/libc.log file is created as requested. No useful messages there because none are enabled in libc. Let's try to enable Xwrite as an example.</p>
<pre><code>0:jnml@e5-1650:~/src/modernc.org/libc$ git status
On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
  (use "git add &lt;file&gt;..." to update what will be committed)
  (use "git restore &lt;file&gt;..." to discard changes in working directory)
modified:   libc_linux.go

no changes added to commit (use "git add" and/or "git commit -a")
0:jnml@e5-1650:~/src/modernc.org/libc$ git log -1
commit 1e22c18cf2de8aa86d5b19b165f354f99c70479c (HEAD -&gt; master, tag: v1.22.3, origin/master, origin/HEAD)
Author: Jan Mercl &lt;0xjnml@gmail.com&gt;
Date:   Wed Feb 22 20:27:45 2023 +0100

    support sqlite 3.41 on linux targets
0:jnml@e5-1650:~/src/modernc.org/libc$ git diff
diff --git a/libc_linux.go b/libc_linux.go
index 1c2f482..ac1f08d 100644
--- a/libc_linux.go
+++ b/libc_linux.go
@@ -332,19 +332,19 @@ func Xwrite(t *TLS, fd int32, buf uintptr, count types.Size_t) types.Ssize_t {
                var n uintptr
                switch n, _, err = unix.Syscall(unix.SYS_WRITE, uintptr(fd), buf, uintptr(count)); err {
                case 0:
-                       // if dmesgs {
-                       //      // dmesg("%v: %d %#x: %#x\n%s", origin(1), fd, count, n, hex.Dump(GoBytes(buf, int(n))))
-                       //      dmesg("%v: %d %#x: %#x", origin(1), fd, count, n)
-                       // }
+                       if dmesgs {
+                               // dmesg("%v: %d %#x: %#x\n%s", origin(1), fd, count, n, hex.Dump(GoBytes(buf, int(n))))
+                               dmesg("%v: %d %#x: %#x", origin(1), fd, count, n)
+                       }
                        return types.Ssize_t(n)
                case errno.EAGAIN:
                        // nop
                }
        }

-       // if dmesgs {
-       //      dmesg("%v: fd %v, count %#x: %v", origin(1), fd, count, err)
-       // }
+       if dmesgs {
+               dmesg("%v: fd %v, count %#x: %v", origin(1), fd, count, err)
+       }
        t.setErrno(err)
        return -1
 }
0:jnml@e5-1650:~/src/modernc.org/libc$
</code>
</pre>
<p>We need to tell the Go build system to use our local, patched/debug libc:</p>
<pre><code>0:jnml@e5-1650:~/src/modernc.org/sqlite$ go work use $(go env GOPATH)/src/modernc.org/libc
0:jnml@e5-1650:~/src/modernc.org/sqlite$ go work use .
</code>
</pre>
<p>And run the test again:</p>
<pre><code>0:jnml@e5-1650:~/src/modernc.org/sqlite$ rm -f /tmp/libc.log ; go test -v -tags=libc.dmesg -run TestScalar ; ls -l /tmp/libc.log
test binary compiled for linux/amd64
=== RUN   TestScalar
--- PASS: TestScalar (0.26s)
PASS
ok   modernc.org/sqlite 0.285s
-rw-r--r-- 1 jnml jnml 918 Apr  6 11:29 /tmp/libc.log
0:jnml@e5-1650:~/src/modernc.org/sqlite$ cat /tmp/libc.log
[11910 sqlite.test] 2023-04-06 11:29:13.143589542 +0200 CEST m=+0.000689270
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0x200: 0x200
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0xc: 0xc
[11910 sqlite.test] libc_linux.go:337:Xwrite: 7 0x1000: 0x1000
[11910 sqlite.test] libc_linux.go:337:Xwrite: 7 0x1000: 0x1000
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0x200: 0x200
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0x4: 0x4
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0x1000: 0x1000
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0x4: 0x4
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0x4: 0x4
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0x1000: 0x1000
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0x4: 0x4
[11910 sqlite.test] libc_linux.go:337:Xwrite: 8 0xc: 0xc
[11910 sqlite.test] libc_linux.go:337:Xwrite: 7 0x1000: 0x1000
[11910 sqlite.test] libc_linux.go:337:Xwrite: 7 0x1000: 0x1000
0:jnml@e5-1650:~/src/modernc.org/sqlite$
</code>
</pre>
<h4><strong>Sqlite documentation </strong><a href="https://pkg.go.dev/modernc.org/sqlite#hdr-Sqlite_documentation"><strong>¶</strong></a></h4>
<p></p>
