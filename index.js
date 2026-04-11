// ===================================================================
// 번역문 내보내기 (translation-exporter)
// llm-translator-custom 확장의 번역문(message.extra.display_text)과
// 원문(message.mes)을 범위 지정하여 클립보드 복사 / txt 저장하는 확장
// ===================================================================

import { getContext } from '../../../extensions.js';

const EXTENSION_NAME = '번역문 내보내기';

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────

function getLastIndex() {
    try {
        const ctx = getContext();
        return ctx?.chat?.length ? ctx.chat.length - 1 : 0;
    } catch {
        return 0;
    }
}

/**
 * 텍스트에 htmlMode 적용
 * 'keep'   - 원본 그대로
 * 'strip'  - 마크다운 코드블록 제거 + HTML 태그만 제거, 텍스트 보존
 * 'remove' - 마크다운 코드블록 + HTML 태그+내용 전체 제거
 */
function applyHtmlMode(text, htmlMode) {
    if (!text) return text;

    if (htmlMode === 'keep') {
        return text;
    }

    // strip / remove 공통 전처리:
    // 1. 마크다운 코드블록(```...```) 통째로 제거
    let result = text.replace(/```[\s\S]*?```/g, '');
    // 2. {{img::...}} 플레이스홀더 제거
    result = result.replace(/\{\{img::[^}]*\}\}/gi, '');

    if (htmlMode === 'remove') {
        // HTML 태그+내용 전체 제거 (중첩 대응 반복)
        let prev;
        do {
            prev = result;
            result = result.replace(/<[^>\/\s][^>]*>[\s\S]*?<\/[^>]+>/g, '');
        } while (result !== prev);
        result = result.replace(/<[^>]+>/g, '');
        return result.trim() || null;
    }

    // 'strip' - HTML 태그만 제거, 텍스트 보존
    const tmp = document.createElement('div');
    tmp.innerHTML = result;
    return tmp.innerText || tmp.textContent || result;
}


// ─────────────────────────────────────────────
// 공백 정리 (HTML 잔재 스페이스/탭 줄 제거 후 연속 빈 줄 압축)
// ─────────────────────────────────────────────

function cleanupWhitespace(text) {
    if (!text || !text.trim()) return text;
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+$/gm, '')        // 각 줄 끝 스페이스/탭 제거
        .replace(/^[ \t]+$/gm, '')       // 스페이스/탭만 있는 줄 → 빈 줄
        .replace(/\n{3,}/g, '\n\n')      // 3줄 이상 빈 줄 → 2줄로
        .trim();
}

// ─────────────────────────────────────────────
// 핵심: 범위 내 메시지 수집
// ─────────────────────────────────────────────

function collectMessages(start, end, mode, hiddenMode, htmlMode) {
    const ctx = getContext();
    if (!ctx?.chat?.length) {
        toastr.error('현재 채팅이 없습니다.');
        return null;
    }

    const chat = ctx.chat;
    const actualEnd = Math.min(end, chat.length - 1);
    const lines = [];

    for (let i = start; i <= actualEnd; i++) {
        const msg = chat[i];
        if (!msg) continue;

        // SillyTavern /hide: is_system + DOM display:none 이중 검증
        const isSystemHidden = !!msg.is_system;
        const domEl = document.querySelector(`#chat .mes[mesid="${i}"]`);
        const isDomHidden = domEl
            ? (domEl.style.display === 'none' || getComputedStyle(domEl).display === 'none')
            : false;
        const isHidden = isSystemHidden || isDomHidden;

        if (hiddenMode === 'skip' && isHidden) continue;
        if (hiddenMode === 'only' && !isHidden) continue;

        const name = msg.name || (msg.is_user ? '나' : 'AI');
        // 원문에도 htmlMode 적용
        const original = applyHtmlMode(msg.mes || '', htmlMode) || '';
        const translation = applyHtmlMode(msg.extra?.display_text, htmlMode);

        if (mode === 'original') {
            if (original) lines.push(`[${i}] ${name}:\n${original}\n`);
        } else if (mode === 'translation') {
            lines.push(`[${i}] ${name}:\n${translation ?? '(번역 없음)'}\n`);
        } else { // 'both'
            lines.push(`[${i}] ${name}:`);
            lines.push(`[원문]\n${original}`);
            lines.push(`[번역]\n${translation ?? '(번역 없음)'}`);
            lines.push('');
        }
    }

    if (!lines.length) {
        toastr.warning('선택 범위에 해당하는 메시지가 없습니다.');
        return null;
    }

    return lines.join('\n');
}

// ─────────────────────────────────────────────
// 클립보드 복사
// ─────────────────────────────────────────────

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        toastr.success('클립보드에 복사되었습니다!');
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            toastr.success('클립보드에 복사되었습니다! (fallback)');
        } catch (e2) {
            toastr.error('클립보드 복사 실패: ' + e2.message);
        }
    }
}

// ─────────────────────────────────────────────
// TXT 저장
// ─────────────────────────────────────────────

function saveAsTxt(text, mode) {
    const modeLabel = { original: '원문', translation: '번역', both: '원문+번역' }[mode] || mode;
    const filename = `번역내보내기_${modeLabel}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastr.success(`"${filename}" 으로 저장되었습니다!`);
}

// ─────────────────────────────────────────────
// 공통 입력값 파싱
// ─────────────────────────────────────────────

function getInputValues() {
    let start = parseInt($('#tranexp_start').val());
    let end   = parseInt($('#tranexp_end').val());
    const lastIdx = getLastIndex();

    if (isNaN(start) || $('#tranexp_start').val().trim() === '') start = 0;
    if (isNaN(end)   || $('#tranexp_end').val().trim() === '')   end   = lastIdx;

    if (start < 0) start = 0;
    if (end > lastIdx) end = lastIdx;
    if (start > end) {
        toastr.error('시작 번호가 끝 번호보다 큽니다.');
        return null;
    }

    $('#tranexp_start').val(start);
    $('#tranexp_end').val(end);

    const mode       = $('input[name="tranexp_mode"]:checked').val()  || 'translation';
    const hiddenMode = $('input[name="tranexp_hidden"]:checked').val() || 'skip';
    const htmlMode   = $('input[name="tranexp_html"]:checked').val()   || 'strip';
    return { start, end, mode, hiddenMode, htmlMode };
}

// ─────────────────────────────────────────────
// 버튼 핸들러
// ─────────────────────────────────────────────

function handleLoadPreview() {
    const vals = getInputValues();
    if (!vals) return;
    const text = collectMessages(vals.start, vals.end, vals.mode, vals.hiddenMode, vals.htmlMode);
    if (text !== null) $('#tranexp_preview').val(text);
}

function handleCleanup() {
    const $preview = $('#tranexp_preview');
    const current = $preview.val();
    if (!current.trim()) { toastr.warning('미리보기에 내용이 없습니다.'); return; }
    const cleaned = cleanupWhitespace(current);
    $preview.prop('readonly', false);
    $preview.val(cleaned);
    $preview.prop('readonly', true);
    if (cleaned.length < current.length) {
        toastr.success('공백 정리 완료!');
    } else {
        toastr.info('정리할 공백이 없습니다.');
    }
}

function getTextForExport(vals) {
    // 미리보기에 내용이 있으면 그걸 우선 사용 (공백 정리 등 편집 반영)
    // 없으면 새로 수집
    const preview = $('#tranexp_preview').val();
    if (preview && preview.trim()) return preview;
    return collectMessages(vals.start, vals.end, vals.mode, vals.hiddenMode, vals.htmlMode);
}

function handleCopy() {
    const vals = getInputValues();
    if (!vals) return;
    const text = getTextForExport(vals);
    if (text) copyToClipboard(text);
}

function handleSave() {
    const vals = getInputValues();
    if (!vals) return;
    const text = getTextForExport(vals);
    if (text) saveAsTxt(text, vals.mode);
}

// ─────────────────────────────────────────────
// UI 세팅패널 주입
// ─────────────────────────────────────────────

async function loadSettingsUI() {
    const settingsHtml = `
<div id="tranexp_settings" class="extension_settings">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>번역문 내보내기</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
        </div>
        <div class="inline-drawer-content" style="display:none;">

            <!-- 메시지 범위 -->
            <div class="tranexp_row">
                <span class="tranexp_label">메시지 범위</span>
                <div class="tranexp_range_wrap">
                    <input id="tranexp_start" type="number" min="0" placeholder="시작" class="tranexp_num_input" />
                    <span>~</span>
                    <input id="tranexp_end" type="number" min="0" placeholder="끝" class="tranexp_num_input" />
                    <button id="tranexp_btn_fillmax" class="menu_button tranexp_small_btn" title="끝 번호를 마지막 메시지로 채우기">마지막</button>
                </div>
            </div>

            <!-- 옵션 그리드 -->
            <div class="tranexp_grid">

                <span class="tranexp_grid_label">숨김 메시지</span>
                <div class="tranexp_grid_options">
                    <label class="tranexp_radio_label">
                        <input type="radio" name="tranexp_hidden" value="skip" checked />
                        제외
                    </label>
                    <label class="tranexp_radio_label">
                        <input type="radio" name="tranexp_hidden" value="include" />
                        포함
                    </label>
                    <label class="tranexp_radio_label">
                        <input type="radio" name="tranexp_hidden" value="only" />
                        숨김만
                    </label>
                </div>

                <span class="tranexp_grid_label">내보낼 내용</span>
                <div class="tranexp_grid_options">
                    <label class="tranexp_radio_label">
                        <input type="radio" name="tranexp_mode" value="translation" checked />
                        번역문만
                    </label>
                    <label class="tranexp_radio_label">
                        <input type="radio" name="tranexp_mode" value="original" />
                        원문만
                    </label>
                    <label class="tranexp_radio_label">
                        <input type="radio" name="tranexp_mode" value="both" />
                        원문+번역
                    </label>
                </div>

                <span class="tranexp_grid_label">HTML 옵션</span>
                <div class="tranexp_grid_options">
                    <label class="tranexp_radio_label">
                        <input type="radio" name="tranexp_html" value="strip" checked />
                        태그만삭제
                    </label>
                    <label class="tranexp_radio_label">
                        <input type="radio" name="tranexp_html" value="keep" />
                        미삭제
                    </label>
                    <label class="tranexp_radio_label">
                        <input type="radio" name="tranexp_html" value="remove" />
                        전체삭제
                    </label>
                </div>

            </div>

            <!-- 미리보기 -->
            <div class="tranexp_row">
                <span class="tranexp_label">미리보기</span>
                <button id="tranexp_btn_preview" class="menu_button tranexp_small_btn">불러오기</button>
            </div>
            <textarea id="tranexp_preview" class="tranexp_preview_area" readonly placeholder="'불러오기' 버튼을 눌러 내용을 확인하세요."></textarea>
            <div class="tranexp_clear_row">
                <button id="tranexp_btn_cleanup" class="menu_button tranexp_small_btn tranexp_clear_btn">🧹 공백 정리</button>
                <button id="tranexp_btn_clear" class="menu_button tranexp_small_btn tranexp_clear_btn">🗑 비우기</button>
            </div>

            <!-- 실행 버튼 -->
            <div class="tranexp_action_row">
                <button id="tranexp_btn_copy" class="menu_button">📋 클립보드 복사</button>
                <button id="tranexp_btn_save" class="menu_button">💾 TXT 저장</button>
            </div>

        </div>
    </div>
</div>`;

    $('#extensions_settings').append(settingsHtml);

    $('#tranexp_btn_fillmax').on('click', () => {
        $('#tranexp_end').val(getLastIndex());
    });

    $('#tranexp_btn_preview').on('click', handleLoadPreview);
    $('#tranexp_btn_cleanup').on('click', handleCleanup);

    $('#tranexp_btn_clear').on('click', () => {
        $('#tranexp_preview').val('');
        toastr.info('미리보기를 비웠습니다.');
    });

    $('#tranexp_btn_copy').on('click', handleCopy);
    $('#tranexp_btn_save').on('click', handleSave);
}

// ─────────────────────────────────────────────
// 초기화
// ─────────────────────────────────────────────

jQuery(async () => {
    await loadSettingsUI();
    console.log(`[${EXTENSION_NAME}] 로드 완료`);
});
