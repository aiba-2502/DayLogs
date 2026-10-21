import * as React from 'react';
import TextField from '@material-ui/core/TextField';
import Popper from '@material-ui/core/Popper';
import Paper from '@material-ui/core/Paper';
import List from '@material-ui/core/List';
import MenuItem from '@material-ui/core/MenuItem';

interface Props {
    value: string;
    options: string[];
    placeholder: string;
    onChange: (value: string) => void;
}

// 候補付きの入力欄。クリックで全件、入力で絞り込み、↑↓・Enter で選択、Esc で閉じる（元ツールの独自リストと同じ動き）。
// ブラウザ標準の datalist は値が入っていると候補を出さず、出し方もブラウザごとに違うため使わない
export const ComboField: React.FC<Props> = ({value, options, placeholder, onChange}) => {
    const input = React.useRef<HTMLInputElement>(null);
    const list = React.useRef<HTMLUListElement>(null);
    // 表示中の候補（null は閉じている）と選択中の位置
    const [items, setItems] = React.useState<string[] | null>(null);
    const [active, setActive] = React.useState(-1);

    // query が空なら全件、あれば含むものだけ。first は今の値が候補にないとき先頭を選ぶ（↓キーで開いたとき）
    const show = (query: string, current: string, first: boolean) => {
        const q = query.trim().toLowerCase();
        const next = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
        const index = next.indexOf(current);
        setItems(next.length ? next : null);
        setActive(index < 0 && first ? 0 : index);
    };
    const close = () => setItems(null);
    const select = (item: string) => {
        onChange(item);
        close();
    };

    React.useEffect(() => {
        const item = list.current && list.current.children[active];
        if (item) {
            item.scrollIntoView({block: 'nearest'});
        }
    }, [items, active]);

    const keyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!items) {
                show('', value, true);
            } else {
                setActive(e.key === 'ArrowDown' ? Math.min(active + 1, items.length - 1) : Math.max(active - 1, 0));
            }
        } else if (e.key === 'Enter' && items && active >= 0) {
            e.preventDefault();
            select(items[active]);
        } else if (e.key === 'Escape' || e.key === 'Tab') {
            close();
        }
    };

    return (
        <>
            <TextField
                fullWidth
                value={value}
                placeholder={placeholder}
                inputRef={input}
                inputProps={{autoComplete: 'off'}}
                onClick={() => (items ? close() : show('', value, false))}
                onChange={(e) => {
                    onChange(e.target.value);
                    show(e.target.value, e.target.value, false);
                }}
                onKeyDown={keyDown}
                onBlur={close}
            />
            <Popper open={items !== null} anchorEl={input.current} placement="bottom-start" style={{zIndex: 1300}}>
                <Paper
                    style={{
                        // 元ツールと同じく25件分まで、画面が狭ければその分だけ表示してスクロール
                        maxHeight: 'min(750px, 45vh)',
                        overflowY: 'auto',
                        minWidth: input.current ? input.current.offsetWidth : undefined,
                        maxWidth: 480,
                    }}>
                    <List dense disablePadding ref={list}>
                        {(items || []).map((item, i) => (
                            <MenuItem
                                key={i}
                                dense
                                title={item}
                                selected={i === active}
                                style={{textOverflow: 'ellipsis'}}
                                onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => select(item)}>
                                {item}
                            </MenuItem>
                        ))}
                    </List>
                </Paper>
            </Popper>
        </>
    );
};
