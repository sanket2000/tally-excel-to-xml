from flask import Flask, render_template, request, send_file
import pandas as pd
from jinja2 import Environment, FileSystemLoader
import os
import io
from pathlib import Path

template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
env = Environment(loader=FileSystemLoader(template_dir))
app = Flask(__name__)


# Route for the homepage
@app.route("/")
def index():
    return render_template("index.html")


# Route to handle file upload and XML generation
@app.route("/generate", methods=["POST"])
def generate_xml():
    if "file" not in request.files:
        return "No file uploaded", 400

    file = request.files["file"]

    # Load the uploaded Excel file
    df = pd.read_excel(file)

    # Convert date to the required format (YYYYMMDD)
    df["DATE"] = pd.to_datetime(df["DATE"], format="%d-%m-%Y").dt.strftime("%Y%m%d")

    # Replace NaN values with empty strings
    df = df.fillna("")

    # Set up the Jinja2 environment to load templates from the file system
    template = env.get_template("template.xml")

    # Define the company name if needed
    company_name = ""

    # Render the XML
    xml_output = template.render(data=df, company_name=company_name, pd=pd)

    # Use BytesIO to hold the XML data temporarily in memory
    output = io.BytesIO()
    output.write(xml_output.encode("utf-8"))
    output.seek(0)  # Rewind the BytesIO object to the beginning

    # Send the XML file to the user
    return send_file(
        output,
        as_attachment=True,
        download_name=Path(file.filename).stem + "_tally.xml",
        mimetype="application/xml",
    )


if __name__ == "__main__":
    app.run(debug=True)
