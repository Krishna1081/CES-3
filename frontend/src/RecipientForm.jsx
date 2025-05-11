import React from 'react';
import { useForm } from 'react-hook-form';

const RecipientForm = ({ onSubmit, defaultValues }) => {
  const { register, handleSubmit, reset } = useForm({ defaultValues });

  React.useEffect(() => {
    reset(defaultValues); // reset form when editing
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 bg-white rounded shadow">
      <input
        {...register('email', { required: true })}
        placeholder="Email"
        className="w-full p-2 border border-gray-300 rounded"
      />
      <input
        {...register('name')}
        placeholder="Name"
        className="w-full p-2 border border-gray-300 rounded"
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Submit
      </button>
    </form>
  );
};

export default RecipientForm;
