import React from 'react';

type FormFieldCardProps = {
    children: React.ReactNode,
    label: string,
    id: string
};
export const FormFieldCard = (props: FormFieldCardProps) => {
    return (
        <div className="bg-gray-500 border-none p-3 text-white">
            <label htmlFor={props.id} className="mb-2 block">{props.label}</label>
            {props.children}
        </div>
    );
}