import {clsx} from "clsx";

const ControlledCheckbox = ({labelText, state, setter, disabled=false} :
                            {labelText: string, state: boolean, setter: (b: boolean) => void, disabled?: boolean}) => {
    return (<label>
        <input disabled={disabled} type="checkbox" className={clsx(
            "mr-2 rounded-sm border-1 focus:ring-0 border-neutral-900 h-4 w-4 checked:bg-emerald-800 checked:text-black text-black  accent-lime-400",
            disabled && "bg-neutral-700",
            disabled && "checked:bg-neutral-700",
        )} checked={state} onChange={event => setter(event.target.checked)}></input>
        <span className={clsx(disabled && "text-neutral-500")}>{labelText}</span>
    </label>)
}

export default ControlledCheckbox;