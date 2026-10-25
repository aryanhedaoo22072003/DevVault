#!/usr/bin/env bash
set -euo pipefail

required_env=(APP_ENV PORT LOG_LEVEL)
validate_environment() {
  local key
  for key in "${required_env[@]}"; do
    if [[ -z "${!key:-}" ]]; then printf 'missing:%s\n' "$key"; return 1; fi
  done
  [[ "$APP_ENV" =~ ^(development|staging|production)$ ]] || { printf 'invalid:APP_ENV\n'; return 1; }
  [[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT > 0 && PORT <= 65535 )) || { printf 'invalid:PORT\n'; return 1; }
  printf 'configuration:valid\n'
}

deployment_decision() {
  local error_rate="$1" latency_ms="$2"
  if (( error_rate > 2 || latency_ms > 500 )); then printf 'rollback\n'; else printf 'continue\n'; fi
}

backup_manifest() {
  local backup_id="$1" checksum="$2"
  printf '{"backupId":"%s","checksum":"%s","restoreTested":false}\n' "$backup_id" "$checksum"
}

case "${1:-}" in
  validate) validate_environment ;;
  decide) deployment_decision "${2:?error rate required}" "${3:?latency required}" ;;
  manifest) backup_manifest "${2:?backup id required}" "${3:?checksum required}" ;;
  *) printf 'usage: %s {validate|decide|manifest}\n' "$0" >&2; exit 64 ;;
esac
