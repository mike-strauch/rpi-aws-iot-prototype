import React from 'react';

type FormFieldCardProps = {
    children: React.ReactNode,
    label: string,
    id: string
};
export const FormFieldCard = (props: FormFieldCardProps) => {
    return (
        <div className="bg-slate-500 border-solid rounded-lg border-2 border-gray-200 p-4 text-white">
            <label htmlFor={props.id} className="mb-2 inline-block">{props.label}</label>
            {props.children}
        </div>
    );
}