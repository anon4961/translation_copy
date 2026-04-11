# 번역문 내보내기 (translation-copy)

SillyTavern용 확장입니다.
**LLM Translator**, **LLM Translator - custom**, **Magic Translation** 확장으로 번역된 채팅의 번역문(또는 원문)을 메시지 번호 범위로 지정하여 클립보드 복사 또는 TXT 파일로 내보낼 수 있습니다.

---

## 주의사항

- **LLM Translator**, **LLM Translator - custom**, **Magic Translation** 중 하나 이상이 설치·활성화되어 있어야 번역문을 읽어올 수 있습니다. 세 확장 모두 동일한 필드(`message.extra.display_text`)에 번역문을 저장하므로 호환됩니다.
- 번역이 완료된 메시지만 번역문을 읽어옵니다. 번역되지 않은 메시지는 `(번역 없음)`으로 표시됩니다.
- 번역문은 위 확장들이 내부적으로 사용하는 `message.extra.display_text` 필드에서 읽어옵니다. 해당 확장이 업데이트되어 내부 구조가 변경되면 번역문을 불러오지 못할 수 있습니다.
- 원문은 SillyTavern의 `chat` 데이터에서 직접 읽어오므로 별도 확장 없이 사용 가능합니다.

---

## 기능

**메시지 범위** — 시작·끝 번호를 직접 입력. 비워두면 전체 자동 적용.

**숨김 메시지** — 제외 / 포함 / 숨김만 선택 가능.

**내보낼 내용** — 번역문만 / 원문만 / 원문+번역 같이.

**HTML 옵션** — 원문·번역문 모두에 적용됩니다.
- 태그만삭제: HTML 태그를 제거하고 텍스트만 남깁니다.
- 미삭제: 원본 그대로 출력합니다.
- 전체삭제: HTML 태그와 내용을 모두 제거합니다.
- `{{img::파일명}}` 형식의 이미지 플레이스홀더는 태그만삭제·전체삭제 시 함께 제거됩니다.

**미리보기** — 불러오기 버튼으로 내용 확인 후, 공백 정리·비우기 가능. 미리보기로 확인하지 않고 범위와 옵션만 선택 후 바로 클립보드 복사 혹은 TXT 저장도 가능합니다.

**클립보드 복사 / TXT 저장** — 둘 다 지원합니다.

---

## 참고

- 번역문 저장 필드(`message.extra.display_text`)는 [llm-translator](https://github.com/1234anon/llm-translator), [llm-translator-custom](https://github.com/NamelessKkang/llm-translator-custom), [Magic Translation](https://github.com/shortiefel/SillyTavern-Magic-Translation) 소스를 참고했습니다.
숨김 메시지 감지 방식(`message.is_system`) 및 클립보드 복사·TXT 저장은 [ggang-copy](https://github.com/ggang-copy) 확장을 참고했습니다.
