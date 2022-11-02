export let messages;
export let availableMessages;

const templatesFolder = 'templates';
const messageTemplate = _.template($('#message-template').html());

function installParameterExplanation($code, message, paramName, param) {
    // parse the param (eg, "player.uuid")
    paramName = paramName.split('.');
    paramName = paramName.map(p => {
        const arrayIndex = p.indexOf('[');
        if (arrayIndex !== -1) {
            return [p.substr(0, arrayIndex), p.substr(arrayIndex)];
        }
        return p;
    }).flat();

    // find the element
    let $paramName = $code.find('.hljs-attr').first();
    let $paramValue;
    for (let path of paramName) {
        const isArrayIndex = path.indexOf('[') !== -1;
        const arrayIndex = +path.substr(path.indexOf('[') + 1, path.indexOf(']') - 1);
        if (!isArrayIndex) {
            while ($paramName.filter(`:contains(${path})`).length === 0) {
                $paramName = $paramName.nextAll('.hljs-attr').first();
                
                if ($paramName.next().length === 0) {
                    break;
                }
            }
        } else {
            for (let i = 0; i < arrayIndex + 1; i++) {
                $paramName = $paramName.nextAll('[class^="hljs-"]').first();
            }
        }
    }

    // change the element
    const paramSamplesAreObjects = !param.samples || (typeof param.samples[0] === 'object');
    if (paramSamplesAreObjects) {
        $paramName.addClass('message-param-name');
    } else {
        $paramValue = $paramName.nextAll('[class^="hljs-"]').first();
        $paramName.addClass('message-param-name');
        $paramValue.addClass('message-param-value');
    }
    

    // creates and configures popups
    let paramNamePopup = `<div>${param.description}</div>`;
    let samplesPopup;
    if (param.samples) {
        const paramValuesTemplate = _.template(`
            <div class="<%= beginningOfPopup ? 'header' : '' %>">Valores de exemplo:</div>
            <div class="ui divided list">
                <% samples.forEach(s => {%>
                    <% if (typeof s === 'object') { %>
                        <div class="item"><pre><code class="lang-json"><%= JSON.stringify(s, null, 2) %></code></pre></div>
                    <% } else { %>
                        <div class="item"><%= s %></div>
                    <% } %>
                <% }); %>
            </div>`);
        const offscreenElement = document.createElement('div');
        offscreenElement.innerHTML = paramValuesTemplate({ ...param, beginningOfPopup: !!$paramValue });
        offscreenElement.querySelectorAll('code').forEach(el => hljs.highlightBlock(el));
        samplesPopup = offscreenElement.innerHTML;

        if (!$paramValue) {
            paramNamePopup += samplesPopup;
        } else {
            $paramValue.popup({
                html: samplesPopup
            });
        }
    }

    $paramName.popup({
        html: paramNamePopup
    });
}

function installMessageExplanation($el, message) {
    Object.keys(message.format.params).forEach(param => installParameterExplanation($el.find('.format'), message, param, message.format.params[param]));
    if (message.hasResponse) {
        Object.keys(message.responseFormat.params).forEach(param => installParameterExplanation($el.find('.response-format'), message, param, message.responseFormat.params[param]));
    }
}

export function showMessage($el, name) {
    const message = messages.find(m => m.name === name);
    message.loaded.then(() => {

        $el.html(messageTemplate(message));
        $el.find('pre > code').each((i, el) => hljs.highlightBlock(el));
        installMessageExplanation($el, message);
        location.hash = name;
    
        const checkNonNode = (i, el) => el.nodeType !== Node.ELEMENT_NODE;
        const onlyElementsWithoutNodeChildren = (i, el) => $(el).children().filter(checkNonNode).length === 0;
        const $messageDescendants = $el.find('*').filter(onlyElementsWithoutNodeChildren);
        $messageDescendants.each((i, el) => {
            el.style.opacity = 0;
            el.animate([
                // keyframes
                {
                    transform: 'translateX(-20px)',
                    opacity: 0.8
                },
                {
                    transform: 'translateX(0px)',
                    opacity: 1.0
                }
            ], {
                // timing options
                duration: 200,
                delay: 15 * i,
                easing: 'ease-out',
                fill: 'forwards',
                iterations: 1
            });
        });
    });
}


export function loadMessages(config, $message) {
    availableMessages = config.messages.map(m => m.name);

    messages = config.messages.map(m => {
        const format = m.format.template;
        const responseFormat = m.hasResponse ? m.responseFormat.template : null;
        const promises = [];

        promises[0] = fetch(`${templatesFolder}/${config.version}/${format}`)
            .then(r => r.json())
            .then(r => m.format.content = JSON.stringify(r, null, 2));

        if (responseFormat) {
            promises[1] = fetch(`${templatesFolder}/${config.version}/${responseFormat}`)
                .then(r => r.json())
                .then(r => m.responseFormat.content = JSON.stringify(r, null, 2));

        }
        m.loaded = Promise.all(promises);

        return m;
    });

    const messageInURL = availableMessages.find(am => am === (location.hash || '#').substr(1));
    if (messageInURL) {
        showMessage($message, messageInURL);
    }
}

export function populateMessageLinks($message, $links, linkTemplate) {
    linkTemplate = _.template(linkTemplate);
    $links.html();

    const messageLinks = messages.map(m => linkTemplate(m));
    $links.append(messageLinks);

    $links.off('click', 'a', showMessageFromLink);
    $links.on('click', 'a', showMessageFromLink);

    function showMessageFromLink(e) {
        e.preventDefault();
        const name = e.target.href.substr(e.target.href.indexOf('#') + 1);
        $message[0].scrollIntoView({ behavior: 'smooth' });
        showMessage($message, name);
    }
}