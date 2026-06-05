try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

from langchain_core.documents import Document

def split_documents(docs: list[Document], chunk_size: int = 800, chunk_overlap: int = 150) -> list[Document]:
    """Splits loaded LangChain Document objects into smaller chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        add_start_index=True
    )
    return splitter.split_documents(docs)
