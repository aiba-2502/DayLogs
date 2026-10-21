import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {act, Simulate} from 'react-dom/test-utils';
import {ComboField} from './ComboField';

// テスト環境（jsdom）には Popper が使う document.createRange と scrollIntoView がない
Element.prototype.scrollIntoView = () => undefined;
document.createRange = () =>
    (({setStart: () => undefined, setEnd: () => undefined, commonAncestorContainer: document.body} as unknown) as Range);

const options = ['実装・単体テスト', '結合テスト', 'システム設計'];

const Field: React.FC<{onSelect: (value: string) => void}> = ({onSelect}) => {
    const [value, setValue] = React.useState('');
    return (
        <ComboField
            value={value}
            options={options}
            placeholder=""
            onChange={(v) => {
                setValue(v);
                onSelect(v);
            }}
        />
    );
};

const shown = () => Array.from(document.querySelectorAll('li')).map((li) => li.textContent);

it('shows all candidates on click, filters while typing and selects with the keyboard', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const selected: string[] = [];
    act(() => {
        ReactDOM.render(<Field onSelect={(v) => selected.push(v)} />, container);
    });
    const input = container.querySelector('input')!;

    act(() => Simulate.click(input));
    expect(shown()).toEqual(options);
    act(() => Simulate.click(input));
    expect(shown()).toEqual([]);

    input.value = 'テスト';
    act(() => Simulate.change(input));
    expect(shown()).toEqual(['実装・単体テスト', '結合テスト']);
    act(() => Simulate.keyDown(input, {key: 'ArrowDown'}));
    act(() => Simulate.keyDown(input, {key: 'ArrowDown'}));
    act(() => Simulate.keyDown(input, {key: 'Enter'}));
    expect(selected[selected.length - 1]).toBe('結合テスト');
    expect(shown()).toEqual([]);

    act(() => Simulate.keyDown(input, {key: 'ArrowDown'}));
    expect(shown()).toEqual(options);
    act(() => Simulate.keyDown(input, {key: 'Escape'}));
    expect(shown()).toEqual([]);

    ReactDOM.unmountComponentAtNode(container);
});
