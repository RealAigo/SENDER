import React, { useMemo, useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const QuillEditor = ({ value, onChange, placeholder = "Write your email content here..." }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'color', 'background',
    'align',
    'link', 'image', 'video'
  ];

  // Fallback to textarea if ReactQuill fails to load
  if (!mounted) {
    return (
      <div className="quill-editor-wrapper">
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            minHeight: '350px',
            padding: '15px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontFamily: 'inherit',
            fontSize: '14px'
          }}
        />
        <p style={{ marginTop: '10px', color: '#666', fontSize: '12px' }}>
          Loading rich text editor... If this persists, please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="quill-editor-wrapper">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};

export default QuillEditor;

