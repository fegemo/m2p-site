import { availableMessages, showMessage } from './message.js';

const diagramsPath = 'diagrams';
const availableDiagrams = [
    {
        file: 'single-player.txt',
        description: 'Interação de 1 jogador',
        name: 'single-player',
        size: 14
    },
    {
        file: 'three-players.txt',
        description: 'Interação de 3 jogadores',
        name: 'three-players',
        size: 10
    },
    {
        file: 'heartbeat.txt',
        description: 'Mensagens de status',
        name: 'heartbeat',
        size: 14
    },
    {
        file: 'discovery.txt',
        description: 'Mensagens de descoberta',
        name: 'discovery',
        size: 14
    }
];

export function showDiagram($el, $messageEl, $descriptionEl, diagram) {
    if (typeof diagram === 'string') {
        diagram = availableDiagrams.find(ad => ad.name === diagram);
    }

    const description = $(`#${diagram.name}-description`).html();
    $descriptionEl.html(description);
    
    $el.html(`
        <div class="ui placeholder" style="width: 100%;">
            <div class="image" style="height: 600px; width: 90%;"></div>
        </div>`
    );
    fetch(`${diagramsPath}/${diagram.file}`)
        .then(r => r.text())
        .then(r => $el.html(r))
        .then(r => {
            $el.sequenceDiagram({ theme: 'simple', 'font-size': diagram.size });
            const polling = setInterval(() => {
                const $svg = $el.find('svg');
                const svgCreated = $svg.length != 0;
                if (svgCreated) {
                    clearInterval(polling);

                    // makes signals with messages clickable
                    const $signals = $svg.find('.signal');
                    const textContainsMessage = el => availableMessages.find(am => el.innerHTML.indexOf(am) !== -1);
                    const elementContainsTextWithMessage = (i, el) => Array.from(el.querySelectorAll('text')).find(textContainsMessage);
                    const $signalsWithMessages = $signals.filter(elementContainsTextWithMessage);
                    const extractMessage = $signal => availableMessages.find(am => $signal.find('tspan').html().indexOf(am) !== -1);
                    $signalsWithMessages.addClass('clickable').click(e => showMessage($messageEl, extractMessage($(e.currentTarget))));

                    // makes notes without text transparent (they were used just for vspacing)
                    const $notes = $svg.find('.note');
                    const noteWithoutText = (i, el) => Array.from(el.querySelectorAll('tspan')).every(tEl => tEl.innerHTML === '');
                    const $notesEmpty = $notes.filter(noteWithoutText);
                    $notesEmpty.css('visibility', 'hidden');

                    // makes notes with console/controller state be styled differently
                    const noteWithContainingText = text => (i, el) => Array.from(el.querySelectorAll('tspan')).some(tEl => tEl.innerHTML.indexOf(text) !== -1);
                    const $notesConsole = $notes.filter(noteWithContainingText('{{c}}'));
                    const $notesController = $notes.filter(noteWithContainingText('{{p}}'));
                    $notesConsole.addClass('console');
                    $notesController.addClass('controller');
                    $notesConsole.find('tspan').each((i, tEl) => tEl.innerHTML = tEl.innerHTML ? tEl.innerHTML.replace(/\{\{c\}\}/g, '') : '');
                    $notesController.find('tspan').each((i, tEl) => tEl.innerHTML = tEl.innerHTML ? tEl.innerHTML.replace(/\{\{p\}\}/g, '') : '');
                }
            }, 200);
        });
}

export function setupDiagramSelector($selectorParent, $diagramDescriptionEl, $diagramEl, $messageEl) {
    $selectorParent.on('click', 'button', e => {
        const $clickedButton = $(e.target);
        const desiredDiagramName = $clickedButton.data('diagram');
        showDiagram($diagramEl, $messageEl, $diagramDescriptionEl, desiredDiagramName);

        $selectorParent.find('button').not($clickedButton).removeClass('active');
        $clickedButton.addClass('active');
    });
}
