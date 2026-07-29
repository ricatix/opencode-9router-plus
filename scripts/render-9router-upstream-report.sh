#!/bin/sh
set -eu

previous= current= compare= output=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --previous|--current|--compare|--output)
      key=$1
      [ "$#" -ge 2 ] || { printf '%s\n' "missing value for $key" >&2; exit 2; }
      shift
      case "$key" in
        --previous) [ -z "$previous" ] || exit 2; previous=$1 ;;
        --current) [ -z "$current" ] || exit 2; current=$1 ;;
        --compare) [ -z "$compare" ] || exit 2; compare=$1 ;;
        --output) [ -z "$output" ] || exit 2; output=$1 ;;
      esac
      ;;
    *) printf '%s\n' "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

for value in "$previous" "$current"; do
  printf '%s' "$value" | grep -Eq '^[0-9a-f]{40}$' || { printf '%s\n' 'SHA must be 40 lowercase hexadecimal characters' >&2; exit 2; }
done
[ -n "$compare" ] && [ -n "$output" ] || { printf '%s\n' 'all arguments are required' >&2; exit 2; }
[ -f "$compare" ] || { printf '%s\n' 'compare must be a local file' >&2; exit 2; }
[ "$previous" = "$current" ] && exit 0

tmp="$(mktemp "${TMPDIR:-/tmp}/9router-report.XXXXXX")"
trap 'rm -f "$tmp"' EXIT HUP INT TERM
ruby -rjson -e '
  allowed = %w[
    open-sse/providers/registry/index.js open-sse/providers/index.js
    open-sse/providers/schema.js open-sse/providers/models/schema.js
    open-sse/providers/models/helpers.js open-sse/config/providerModels.js
    open-sse/config/grokCli.js open-sse/providers/thinkingLevels.js
    open-sse/providers/capabilities.js
  ]
  data = JSON.parse(File.read(ARGV[0]))
  abort "compare must be an object" unless data.is_a?(Hash)
  abort "truncated compare" if data["truncated"] == true
  files = data["files"]
  abort "files must be an array" unless files.is_a?(Array)
  abort "compare files list may be incomplete (300 or more files)" if files.length >= 300
  paths = files.map { |file| abort "file must be an object" unless file.is_a?(Hash); name = file["filename"]; abort "filename must be a string" unless name.is_a?(String); name }.select { |name| allowed.include?(name) || name.match?(%r{\Aopen-sse/providers/registry/[^/]+\.js\z}) }.uniq.sort
  puts "# 9router upstream change report"
  puts
  puts "Previous upstream SHA: `#{ARGV[1]}`"
  puts "Current upstream SHA: `#{ARGV[2]}`"
  puts
  puts "Detector/report-only: never refreshes catalog, alters runtime, publishes, tags, or releases."
  puts
  puts "## Whitelisted changed paths"
  puts
  paths.each { |path| puts "- `#{path}`" }
' "$compare" "$previous" "$current" > "$tmp"
mv -f "$tmp" "$output"
trap - EXIT HUP INT TERM
