# Gera .htaccess e index.html a partir de redirect-backend.url e public-origin.url
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = (Get-Content (Join-Path $here "redirect-backend.url") -Raw).Trim().TrimEnd("/")
$public = (Get-Content (Join-Path $here "public-origin.url") -Raw).Trim().TrimEnd("/")

$htaccess = @"
# InfinityFree (Apache) — encaminha todo o tráfego do domínio free.nf para o app (SSR).
# Edite redirect-backend.url e rode: npm run pack:infinityfree

RewriteEngine On
RewriteRule ^(.*)$ $backend/`$1 [R=302,L]
"@

Set-Content -Path (Join-Path $here "htdocs\.htaccess") -Value $htaccess -Encoding ASCII

$index = @"
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Recanto das Águas · Sistema</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        display: grid;
        min-height: 100vh;
        place-items: center;
        margin: 0;
        background: #f0f4f8;
        color: #111827;
      }
      main { text-align: center; padding: 2rem; }
      a { color: #1e40af; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      <h1>Recanto das Águas</h1>
      <p>Redirecionando para o sistema…</p>
    </main>
    <script>
      var backend = "$backend";
      var dest = backend + location.pathname + location.search + location.hash;
      location.replace(dest);
    </script>
  </body>
</html>
"@

foreach ($dir in @("htdocs", "sitema-hotel-upload")) {
  Set-Content -Path (Join-Path $here "$dir\index.html") -Value $index -Encoding UTF8
}

Write-Host "OK: $public -> $backend (upload deploy/infinityfree/htdocs para o InfinityFree)"
