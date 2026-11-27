# Duck Boat

한 기기를 돌려 가며 오리를 태우는 파티 게임입니다. 화면을 누르는 동안 오리가 올라가고 손을 떼면 배가 흔들립니다. 자기 차례에 배를 침몰시킨 사람이 집니다. [게임 열기](https://sseo-kr.github.io/duck-boat/)

## 로컬에서 실행

저장소 루트에서 `python3 -m http.server 8000 --bind 127.0.0.1`을 실행하고 브라우저에서 `http://127.0.0.1:8000/`를 엽니다.

## 게임 수정과 배포

게임 규칙과 입력은 `game.js`, 배와 오리 애니메이션은 `scene.js`에 있습니다. `index.html`과 `style.css`는 시작 화면과 조작 버튼을 구성합니다.

변경 사항은 PR로 제출합니다. `Verify Duck Boat` 검사는 JavaScript와 게임 파일을 확인하고 Chrome에서 인원 선택 화면을 엽니다. 검사가 통과한 PR을 `main`에 병합하면 GitHub Pages가 배포하고 모바일 앱도 같은 주소에서 변경 사항을 받습니다.
